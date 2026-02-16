"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import {
  listenConversations,
  listenSupportMessages,
  listenConversation,
  markConversationRead,
  reopenConversation,
  resolveConversation,
  sendSupportMessage,
  setConversationCategory,
  setTyping,
  setSupportPresence,
  Conversation,
  ChatMessage,
} from "@/lib/support-chat";
import { doc, getDoc } from "firebase/firestore";

const CATEGORIES = ["General", "Billing", "Bug", "Feature Request", "Account", "Other"];

function toMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  if (typeof ts?.seconds === "number") return ts.seconds * 1000;
  return 0;
}

export default function AdminChatPage() {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [rows, setRows] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);

  // ✅ live meta from Firestore for selected conv
  const [selectedMeta, setSelectedMeta] = useState<Conversation | null>(null);

  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  const [reply, setReply] = useState("");

  // ✅ presence toggle + heartbeat
  const [presenceOn, setPresenceOn] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auth + admin check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setReady(true);
        setIsAdmin(false);
        return;
      }

      const adminSnap = await getDoc(doc(db, "admins", u.uid));
      setIsAdmin(adminSnap.exists());
      setReady(true);
    });

    return () => unsub();
  }, []);

  // ✅ Presence heartbeat while admin page open
  useEffect(() => {
    if (!isAdmin) return;

    let alive = true;
    let t: number | undefined;

    const tick = async () => {
      if (!presenceOn) return;
      try {
        await setSupportPresence(true);
      } catch {}
      if (!alive) return;
      t = window.setTimeout(tick, 20000);
    };

    // immediate pulse
    t = window.setTimeout(tick, 0);

    const onUnload = () => {
      setSupportPresence(false).catch(() => {});
    };

    window.addEventListener("beforeunload", onUnload);

    return () => {
      alive = false;
      if (t) window.clearTimeout(t);
      window.removeEventListener("beforeunload", onUnload);
      setSupportPresence(false).catch(() => {});
    };
  }, [isAdmin, presenceOn]);

  // Listen inbox
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = listenConversations(setRows);
    return () => unsub();
  }, [isAdmin]);

  // Listen messages + meta for selected conversation
  useEffect(() => {
    if (!selected) return;

    const unsubMsgs = listenSupportMessages(selected.id, setMsgs);
    const unsubMeta = listenConversation(selected.id, setSelectedMeta);

    markConversationRead(selected.id, "support").catch(() => {});
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 50);

    return () => {
      unsubMsgs();
      unsubMeta();
    };
  }, [selected?.id]);

  // scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const stats = useMemo(() => {
    const open = rows.filter((r) => r.status === "open").length;
    const resolved = rows.filter((r) => r.status === "resolved").length;
    return { open, resolved, total: rows.length };
  }, [rows]);

  const userTyping = useMemo(() => {
    const ms = toMillis(selectedMeta?.typingUserAt);
    return ms > 0 && Date.now() - ms < 8000;
  }, [selectedMeta?.typingUserAt]);

  const supportTyping = useMemo(() => {
    const ms = toMillis(selectedMeta?.typingSupportAt);
    return ms > 0 && Date.now() - ms < 8000;
  }, [selectedMeta?.typingSupportAt]);

  async function send() {
    if (!selected) return;
    const v = reply.trim();
    if (!v) return;

    setReply("");

    // stop typing first
    await setTyping(selected.id, "support", false).catch(() => {});
    await sendSupportMessage(selected.id, "support", v);

    // auto scroll after sending
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  // ✅ typing debounce for support
  useEffect(() => {
    if (!selected) return;
    const id = selected.id;

    if (!reply.trim()) {
      setTyping(id, "support", false).catch(() => {});
      return;
    }

    const t = window.setTimeout(() => {
      setTyping(id, "support", true).catch(() => {});
    }, 350);

    return () => window.clearTimeout(t);
  }, [reply, selected?.id]);

  if (!ready) return <div className="p-8">Loading…</div>;

  if (!auth.currentUser) {
    return (
      <div className="p-10">
        <h1 className="text-3xl font-bold mb-2">Admin Chat</h1>
        <p className="text-gray-500">Please sign in first.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-10">
        <h1 className="text-3xl font-bold mb-2">Admin Chat</h1>
        <p className="text-gray-500">
          You’re signed in, but not an admin yet. Add your UID to Firestore collection{" "}
          <b>admins</b>.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Doc path should be: <b>admins/{auth.currentUser.uid}</b>
        </p>
      </div>
    );
  }

  // ✅ use live meta when available so status/category changes show instantly
  const live = selectedMeta ?? selected;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-8 py-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">Support Inbox</div>
            <div className="text-sm text-gray-500">
              {stats.open} open • {stats.resolved} resolved • {stats.total} total
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ✅ presence toggle */}
            <button
              onClick={async () => {
                const next = !presenceOn;
                setPresenceOn(next);
                try {
                  await setSupportPresence(next);
                } catch {}
              }}
              className={`px-3 py-2 rounded-lg text-sm border ${
                presenceOn ? "bg-black text-white border-black" : "bg-white"
              }`}
              title="Controls the Online/Offline label in the widget"
            >
              {presenceOn ? "Online" : "Offline"}
            </button>

            <button
              onClick={() => setFilter("open")}
              className={`px-3 py-2 rounded-lg text-sm border ${
                filter === "open" ? "bg-black text-white border-black" : "bg-white"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setFilter("resolved")}
              className={`px-3 py-2 rounded-lg text-sm border ${
                filter === "resolved" ? "bg-black text-white border-black" : "bg-white"
              }`}
            >
              Resolved
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-2 rounded-lg text-sm border ${
                filter === "all" ? "bg-black text-white border-black" : "bg-white"
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[360px_1fr]">
        {/* Left */}
        <div className="border-r bg-white min-h-[calc(100vh-73px)]">
          <div className="p-4 text-sm text-gray-500">{filtered.length} conversations</div>

          <div className="space-y-2 p-3">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  selected?.id === c.id
                    ? "bg-black text-white border-black"
                    : "bg-white hover:bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{c.name || "User"}</div>
                  <div
                    className={`text-xs px-2 py-1 rounded-full ${
                      c.status === "resolved"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {c.status}
                  </div>
                </div>

                <div className="text-xs opacity-80 mt-1">{c.email || "No email"}</div>

                <div className="text-sm mt-2 opacity-90 line-clamp-2">
                  {c.lastMessageText || "No messages yet"}
                </div>

                <div className="mt-2 flex items-center justify-between text-xs opacity-80">
                  <span>{c.category || "General"}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="p-6">
          {!selected ? (
            <div className="text-gray-500">Select a conversation from the left.</div>
          ) : (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="font-bold text-lg">Conversation</div>
                  <div className="text-xs text-gray-500">{live?.id}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {live?.name || "User"} • {live?.email || "No email"}
                    {live?.rating ? (
                      <span className="ml-2 text-amber-600 font-semibold">
                        ★ {live.rating}/5
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={live?.category || "General"}
                    onChange={async (e) => setConversationCategory(selected.id, e.target.value)}
                    className="text-sm border rounded-lg px-2 py-2"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {live?.status === "open" ? (
                    <button
                      onClick={async () => {
                        await resolveConversation(selected.id);
                        setTimeout(
                          () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
                          80
                        );
                      }}
                      className="px-3 py-2 rounded-lg bg-black text-white text-sm"
                    >
                      Resolve
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await reopenConversation(selected.id);
                        setTimeout(
                          () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
                          80
                        );
                      }}
                      className="px-3 py-2 rounded-lg bg-white border text-sm"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              <div className="h-[70vh] overflow-y-auto p-4 space-y-3 bg-slate-50">
                <AnimatePresence>
                  {msgs.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.role === "support"
                          ? "bg-black text-white ml-auto"
                          : m.role === "user"
                          ? "bg-white border"
                          : "bg-white/60 border text-gray-700"
                      }`}
                    >
                      {m.text}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* ✅ typing indicators */}
                {userTyping && (
                  <div className="text-xs text-gray-500 px-2">User is typing…</div>
                )}
                {supportTyping && (
                  <div className="text-xs text-gray-500 px-2">Support is typing…</div>
                )}

                <div ref={bottomRef} />
              </div>

              <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Reply as support…"
                    className="flex-1 border rounded-xl px-4 py-3 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        send();
                      }
                    }}
                    onBlur={() => {
                      if (selected) setTyping(selected.id, "support", false).catch(() => {});
                    }}
                  />
                  <button
                    onClick={send}
                    className="px-5 rounded-xl bg-blue-600 text-white font-semibold hover:opacity-90"
                  >
                    Send
                  </button>
                </div>

                {live?.feedback ? (
                  <div className="mt-3 text-sm text-gray-600">
                    <span className="font-semibold">Feedback:</span> {live.feedback}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
