"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ensureConversation,
  startNewConversation,
  getLocalNameEmail,
  listenSupportMessages,
  listenConversation,
  listenSupportPresence,
  markConversationRead,
  sendSupportMessage,
  setConversationDetails,
  setTyping,
  submitConversationRating,
  ChatMessage,
  SupportPresence,
} from "@/lib/support-chat";

type Tab = "home" | "messages" | "news" | "chat";
type Step = "name" | "email" | "connecting" | "issue" | "ready";

const CATEGORIES = ["General", "Billing", "Bug", "Feature Request", "Account", "Other"];

function toMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  if (typeof ts?.seconds === "number") return ts.seconds * 1000;
  return 0;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatTranscript(messages: ChatMessage[]) {
  const lines: string[] = [];
  lines.push("StockHorizon Support Transcript");
  lines.push("--------------------------------");
  for (const m of messages) {
    const who =
      m.role === "user" ? "You" : m.role === "support" ? "Support" : "System";
    lines.push(`${who}: ${m.text}`);
  }
  lines.push("--------------------------------");
  return lines.join("\n");
}

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");

  const [convId, setConvId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);

  const [convMeta, setConvMeta] = useState<any>(null);
  const [presence, setPresence] = useState<SupportPresence | null>(null);

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("General");

  const [input, setInput] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [ratingSent, setRatingSent] = useState(false);

  // NEW: keep transcript after resolution, while we clear chat
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [justResolved, setJustResolved] = useState(false);
  const resolvedHandledRef = useRef(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // boot
  useEffect(() => {
    (async () => {
      try {
        const local = getLocalNameEmail();
        setName(local.name);
        setEmail(local.email);

        if (!local.name) setStep("name");
        else if (!local.email) setStep("email");
        else setStep("connecting");

        const id = await ensureConversation();
        setConvId(id);

        if (local.name && local.email) setTimeout(() => setStep("issue"), 650);

        const unsubMsgs = listenSupportMessages(id, (m) => setMsgs(m));
        const unsubMeta = listenConversation(id, (c) => setConvMeta(c));
        const unsubPresence = listenSupportPresence((p) => setPresence(p));

        return () => {
          unsubMsgs();
          unsubMeta();
          unsubPresence();
        };
      } catch (e: any) {
        setBootError(e?.message || String(e));
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open, tab]);

  useEffect(() => {
    if (!convId) return;
    if (open && tab === "chat") markConversationRead(convId, "user").catch(() => {});
  }, [open, tab, convId]);

  const staffOnline = useMemo(() => {
    const last = toMillis(presence?.lastSeen);
    if (!presence?.online) return false;
    if (!last) return false;
    return Date.now() - last < 60000;
  }, [presence?.online, presence?.lastSeen]);

  const supportTyping = useMemo(() => {
    const ms = toMillis(convMeta?.typingSupportAt);
    return ms > 0 && Date.now() - ms < 8000;
  }, [convMeta?.typingSupportAt]);

  const isResolved = useMemo(() => {
    return (convMeta?.status || "").toLowerCase() === "resolved";
  }, [convMeta?.status]);

  // ✅ CORE: when admin resolves, CLEAR UI by starting new conversation
  useEffect(() => {
    if (!convId) return;
    if (!isResolved) {
      resolvedHandledRef.current = false;
      return;
    }
    if (resolvedHandledRef.current) return;

    resolvedHandledRef.current = true;

    // capture transcript
    const transcript = formatTranscript(msgs);
    setLastTranscript(transcript);
    setJustResolved(true);

    // immediately start a new conversation so messages are "cleared" on user side
    (async () => {
      try {
        // stop typing on the old conversation
        await setTyping(convId, "user", false);

        const newId = await startNewConversation();
        setConvId(newId);

        // reset UI state
        setMsgs([]);
        setConvMeta(null);
        setInput("");
        setRating(0);
        setFeedback("");
        setRatingSent(false);

        // re-wire listeners for new conversation
        const unsubMsgs = listenSupportMessages(newId, (m) => setMsgs(m));
        const unsubMeta = listenConversation(newId, (c) => setConvMeta(c));
        const unsubPresence = listenSupportPresence((p) => setPresence(p));

        (window as any).__support_unsub?.forEach((fn: any) => fn?.());
        (window as any).__support_unsub = [unsubMsgs, unsubMeta, unsubPresence];

        // step should go back to issue if name+email exist, else continue onboarding
        const local = getLocalNameEmail();
        if (!local.name) setStep("name");
        else if (!local.email) setStep("email");
        else setStep("issue");

        // auto-hide banner after a bit
        setTimeout(() => setJustResolved(false), 3500);
      } catch (e) {
        // if something fails, at least don't loop forever
        setJustResolved(false);
      }
    })();
  }, [isResolved, convId, msgs]);

  // typing debounce
  useEffect(() => {
    if (!convId) return;
    if (!input.trim()) {
      setTyping(convId, "user", false).catch(() => {});
      return;
    }
    const t = window.setTimeout(() => {
      setTyping(convId, "user", true).catch(() => {});
    }, 350);
    return () => window.clearTimeout(t);
  }, [input, convId]);

  async function handleOnboardSubmit() {
    if (!convId) return;

    if (step === "name") {
      const v = name.trim();
      if (!v) return;
      await setConversationDetails(convId, { name: v });
      setStep("email");
      return;
    }

    if (step === "email") {
      const v = email.trim();
      if (!v || !v.includes("@")) return;
      await setConversationDetails(convId, { email: v, category });
      setStep("connecting");
      setTimeout(() => setStep("issue"), 800);
      return;
    }

    if (step === "issue") {
      const v = input.trim();
      if (!v) return;
      setInput("");
      await setTyping(convId, "user", false);
      await sendSupportMessage(convId, "user", v);
      setStep("ready");
      return;
    }
  }

  async function handleSend() {
    if (!convId) return;
    const v = input.trim();
    if (!v) return;
    setInput("");
    await setTyping(convId, "user", false);
    await sendSupportMessage(convId, "user", v);
  }

  async function handleRatingSubmit() {
    if (!convId || !rating) return;
    await submitConversationRating(convId, rating, feedback.trim());
    setFeedback("");
    setRatingSent(true);
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setTab("chat");
          setTimeout(() => inputRef.current?.focus(), 150);
        }}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Open support chat"
      >
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-black shadow-2xl hover:scale-105 transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7 opacity-90 group-hover:opacity-100 transition">
            <path d="M2 12c0-4.418 4.03-8 9-8s9 3.582 9 8-4.03 8-9 8c-1.084 0-2.122-.14-3.09-.397L3 21l1.52-3.39C3.57 16.04 2 14.15 2 12z" />
          </svg>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center shadow">
            1
          </span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-24 right-6 z-50 w-[520px] h-[760px] rounded-[36px] bg-black text-white shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src="https://i.pravatar.cc/120" className="w-12 h-12 rounded-full" alt="avatar" />
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black ${
                      staffOnline ? "bg-green-400" : "bg-gray-500"
                    }`}
                  />
                </div>

                <div>
                  <div className="font-semibold text-lg">StockHorizon</div>
                  <div className="text-sm text-gray-400">
                    {staffOnline ? "Online now" : "Offline"}
                  </div>
                </div>
              </div>

              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {bootError && (
                <div className="p-5 rounded-3xl bg-red-950/40 border border-red-500/30 text-red-100 text-base">
                  {bootError}
                </div>
              )}

              {/* ✅ banner after resolve */}
              {justResolved && (
                <div className="p-4 rounded-3xl bg-white/10 border border-white/10">
                  <div className="font-semibold">Conversation resolved ✅</div>
                  <div className="text-sm text-white/70">
                    Starting a new chat (your messages are cleared).
                  </div>
                </div>
              )}

              {/* ✅ transcript card (after resolve) */}
              {lastTranscript && (
                <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
                  <div className="font-semibold mb-2">Previous chat</div>
                  <button
                    onClick={() => downloadText("support-transcript.txt", lastTranscript)}
                    className="w-full rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 py-3 font-semibold"
                  >
                    Download transcript
                  </button>
                </div>
              )}

              <div className="space-y-3 text-base overflow-y-auto pr-1">
                {msgs.length === 0 && (
                  <div className="bg-white/10 p-4 rounded-3xl max-w-[85%] text-lg">
                    Hi there! You’re speaking with StockHorizon support.
                    <div className="mt-2 text-white/70">First, who am I speaking with today?</div>
                  </div>
                )}

                {msgs.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-3xl max-w-[85%] leading-relaxed ${
                      m.role === "user"
                        ? "bg-blue-600 ml-auto"
                        : m.role === "support"
                        ? "bg-white/10"
                        : "bg-white/10 text-white/80"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}

                {supportTyping && (
                  <div className="text-sm text-white/60 px-2">Support is typing…</div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input / Onboarding */}
              <div className="pt-2">
                {step === "name" && (
                  <div className="flex gap-3">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Type your name..."
                      className="flex-1 rounded-2xl bg-white/10 p-4 outline-none text-lg"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleOnboardSubmit();
                        }
                      }}
                    />
                    <button
                      onClick={handleOnboardSubmit}
                      className="px-6 rounded-2xl bg-white text-black font-semibold hover:opacity-90 text-xl"
                    >
                      →
                    </button>
                  </div>
                )}

                {step === "email" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white/60">Category</span>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="text-sm rounded-xl bg-white/10 border border-white/10 px-3 py-2 outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-3">
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Type your email..."
                        className="flex-1 rounded-2xl bg-white/10 p-4 outline-none text-lg"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleOnboardSubmit();
                          }
                        }}
                      />
                      <button
                        onClick={handleOnboardSubmit}
                        className="px-6 rounded-2xl bg-white text-black font-semibold hover:opacity-90 text-xl"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}

                {step === "connecting" && (
                  <div className="rounded-2xl bg-white/10 p-4 text-white/70">Connecting…</div>
                )}

                {(step === "issue" || step === "ready") && (
                  <div className="flex gap-3">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={step === "issue" ? "Describe your issue…" : "Message…"}
                      className="flex-1 rounded-2xl bg-white/10 p-4 outline-none text-lg"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          step === "issue" ? handleOnboardSubmit() : handleSend();
                        }
                      }}
                      onBlur={() => {
                        if (convId) setTyping(convId, "user", false).catch(() => {});
                      }}
                    />
                    <button
                      onClick={() => (step === "issue" ? handleOnboardSubmit() : handleSend())}
                      className="px-6 rounded-2xl bg-blue-600 text-white font-semibold hover:opacity-90 text-lg"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Tabs */}
            <div className="border-t border-white/10 grid grid-cols-3 text-center text-lg">
              <button onClick={() => setTab("home")} className={`py-5 hover:bg-white/5 ${tab === "home" ? "bg-white/5" : ""}`}>
                Home
              </button>
              <button onClick={() => setTab("messages")} className={`py-5 hover:bg-white/5 ${tab === "messages" ? "bg-white/5" : ""}`}>
                Messages
              </button>
              <button onClick={() => setTab("news")} className={`py-5 hover:bg-white/5 ${tab === "news" ? "bg-white/5" : ""}`}>
                News
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
