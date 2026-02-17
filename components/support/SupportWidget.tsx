"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ensureConversation,
  startNewConversation,
  getLocalNameEmail,
  getLocalThreads,
  listenSupportMessages,
  listenConversation,
  listenSupportPresence,
  listenNews,
  markConversationRead,
  sendSupportMessage,
  setConversationDetails,
  setTyping,
  submitConversationRating,
  upsertLocalThread,
  ChatMessage,
  NewsItem,
  SupportPresence,
} from "@/lib/support-chat";

/**
 * Widget goals:
 * - Home / Messages / News tabs actually function (like reference)
 * - Onboarding flow: Category -> Email -> Connecting -> Issue -> Chat
 * - Show offline messaging + estimated wait time
 * - Keep your existing logic (resolve clears) but make UX clean
 * - "Techy": glow, scanlines, subtle motion, crisp UI
 */

type Tab = "home" | "messages" | "news" | "chat";
type Step = "hello" | "name" | "category" | "email" | "connecting" | "issue" | "ready";

const CATEGORIES = ["General", "Billing", "Bug", "Feature Request", "Account", "Other"] as const;

function toMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  if (typeof ts?.seconds === "number") return ts.seconds * 1000;
  return 0;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function safeEmail(v: string) {
  const t = v.trim();
  if (!t) return "";
  return t;
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
    const who = m.role === "user" ? "You" : m.role === "support" ? "Support" : "System";
    lines.push(`${who}: ${m.text}`);
  }
  lines.push("--------------------------------");
  return lines.join("\n");
}

function authErrorText(error: unknown) {
  const message = String((error as any)?.message ?? error ?? "");
  const code = String((error as any)?.code ?? "");
  if (code.includes("permission-denied") || message.includes("permission-denied")) {
    return "Chat permission is blocked by Firestore rules. Allow support chat collections for signed-in users.";
  }
  return message || "Support chat failed to load.";
}

/** Fancy helpers */

function prettyWait(staffOnline: boolean) {
  // You can make this smarter later (queue size, staffing, etc.)
  if (staffOnline) return "Estimated wait: ~2–5 minutes";
  return "We’ll be back online soon. Typical response: ~30–60 minutes";
}

function shortTimeAgo(ms: number) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function IconChevronRight(props: { className?: string }) {
  return (
    <svg className={props.className ?? "w-5 h-5"} viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconInbox(props: { className?: string }) {
  return (
    <svg className={props.className ?? "w-5 h-5"} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h16v12H4V4z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16l4 4h8l4-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChat(props: { className?: string }) {
  return (
    <svg className={props.className ?? "w-5 h-5"} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12c0-4.4 4-8 9-8s9 3.6 9 8-4 8-9 8c-1.1 0-2.1-.1-3.1-.4L3 21l1.6-3.4C4.9 16.1 4 14.2 4 12z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconNews(props: { className?: string }) {
  return (
    <svg className={props.className ?? "w-5 h-5"} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 4h12v16H6V4z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M8 8h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 16h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconBolt(props: { className?: string }) {
  return (
    <svg className={props.className ?? "w-5 h-5"} viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2L3 14h7l-1 8 12-14h-8l0-6z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClose(props: { className?: string }) {
  return (
    <svg className={props.className ?? "w-5 h-5"} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconChevronDown(props: { className?: string }) {
  return (
    <svg className={props.className ?? "w-5 h-5"} viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Visual layer: background + scanlines */
function TechBackdrop() {
  return (
    <>
      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute top-40 -right-24 w-72 h-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -bottom-24 left-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl" />
      </div>

      {/* Scanlines */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 7px)",
        }}
      />

      {/* Noise */}
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.4\"/></svg>')",
        }}
      />
    </>
  );
}

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");

  const [convId, setConvId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);

  const [convMeta, setConvMeta] = useState<any>(null);
  const [presence, setPresence] = useState<SupportPresence | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);

  // onboarding + input
  const [step, setStep] = useState<Step>("hello");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("General");
  const [email, setEmail] = useState("");
  const [input, setInput] = useState("");

  // rating
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [ratingSent, setRatingSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // transcript after resolution
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [justResolved, setJustResolved] = useState(false);
  const resolvedHandledRef = useRef(false);
  const listenersRef = useRef<Array<() => void>>([]);

  // user visible “threads”
  const [threads, setThreads] = useState(() => getLocalThreads());

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function clearListeners() {
    listenersRef.current.forEach((unsub) => unsub());
    listenersRef.current = [];
  }

  function wireConversationListeners(id: string) {
    clearListeners();

    const onListenerError = (error: unknown) => {
      setBootError(authErrorText(error));
    };

    const unsubMsgs = listenSupportMessages(id, (m) => setMsgs(m), onListenerError);
    const unsubMeta = listenConversation(id, (c) => setConvMeta(c), onListenerError);
    const unsubPresence = listenSupportPresence((p) => setPresence(p), onListenerError);
    const unsubNews = listenNews((items) => setNews(items), onListenerError);

    listenersRef.current = [unsubMsgs, unsubMeta, unsubPresence, unsubNews];
  }

  // boot
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const local = getLocalNameEmail();
        if (cancelled) return;

        setName(local.name);
        setEmail(local.email);

        // onboarding order:
        // hello -> name (if missing) -> category -> email -> connecting -> issue
        if (!local.name) setStep("hello");
        else setStep("category");

        const id = await ensureConversation();
        if (cancelled) return;

        setConvId(id);
        wireConversationListeners(id);

        // restore category from conversation if present
        // (conv listener might update later; this is just a UX default)
        const cached = getLocalThreads().find((t) => t.id === id);
        if (cached?.category && (CATEGORIES as any).includes(cached.category)) {
          setCategory(cached.category as any);
        }

        // keep thread list fresh
        setThreads(getLocalThreads());
      } catch (e: any) {
        if (!cancelled) setBootError(authErrorText(e));
      }
    })();

    return () => {
      cancelled = true;
      clearListeners();
    };
  }, []);

  // refresh threads occasionally (cheap)
  useEffect(() => {
    const t = window.setInterval(() => setThreads(getLocalThreads()), 2500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open || tab !== "chat") return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open, tab]);

  useEffect(() => {
    if (!open || tab !== "chat") return;
    const resolvedNow = (convMeta?.status || "").toLowerCase() === "resolved";
    if (resolvedNow) return;
    if (step !== "issue" && step !== "ready") return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open, tab, step, convMeta?.status]);

  useEffect(() => {
    if (!open || tab !== "chat") return;
    const resolvedNow = (convMeta?.status || "").toLowerCase() === "resolved";
    if (resolvedNow) return;
    if (step !== "issue" && step !== "ready") return;
    if (document.activeElement !== inputRef.current) inputRef.current?.focus();
  }, [input, open, tab, step, convMeta?.status]);

  useEffect(() => {
    if (!convId) return;
    if (open && tab === "chat") markConversationRead(convId, "user").catch(() => {});
  }, [open, tab, convId]);

  const staffOnline = useMemo(() => {
    const last = toMillis(presence?.lastSeen);
    if (!presence?.online) return false;
    if (!last) return false;
    return Date.now() - last < 60_000;
  }, [presence?.online, presence?.lastSeen]);

  const supportTyping = useMemo(() => {
    const ms = toMillis(convMeta?.typingSupportAt);
    return ms > 0 && Date.now() - ms < 8000;
  }, [convMeta?.typingSupportAt]);

  const isResolved = useMemo(() => {
    return (convMeta?.status || "").toLowerCase() === "resolved";
  }, [convMeta?.status]);

  const unreadBadge = useMemo(() => {
    const n = Number(convMeta?.unreadForUser ?? 0) || 0;
    return clamp(n, 0, 99);
  }, [convMeta?.unreadForUser]);

  // when admin resolves, capture transcript and let user start a new chat explicitly
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
    const t = window.setTimeout(() => setJustResolved(false), 3500);
    return () => window.clearTimeout(t);
  }, [isResolved, convId, msgs]);

  async function startFreshConversation() {
    if (!convId) return;
    try {
      await setTyping(convId, "user", false);

      const local = getLocalNameEmail();
      const newId = await startNewConversation({
        category,
        name: local.name || name,
        email: local.email || email,
      });

      setConvId(newId);
      setMsgs([]);
      setConvMeta(null);
      setInput("");
      setRating(0);
      setFeedback("");
      setRatingSent(false);
      setJustResolved(false);

      wireConversationListeners(newId);

      if (!local.name && !name.trim()) setStep("hello");
      else if (!safeEmail(local.email) && !safeEmail(email)) setStep("email");
      else setStep("issue");

      setThreads(getLocalThreads());
      openWidgetTo("chat");
    } catch {}
  }

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

  function openWidgetTo(t: Tab) {
    setOpen(true);
    setTab(t);
    if (t === "chat") setTimeout(() => inputRef.current?.focus(), 200);
  }

  async function handleOnboardAdvance() {
    if (isSending) return;
    if (!convId) return;

    // hello -> name
    if (step === "hello") {
      setStep("name");
      return;
    }

    // name -> category
    if (step === "name") {
      const v = name.trim();
      if (!v) return;
      await setConversationDetails(convId, { name: v });
      setStep("category");
      return;
    }

    // category -> email
    if (step === "category") {
      await setConversationDetails(convId, { category });
      setStep("email");
      return;
    }

    // email -> connecting -> issue
    if (step === "email") {
      const v = email.trim();
      if (!v || !v.includes("@")) return;
      await setConversationDetails(convId, { email: v, category });

      setStep("connecting");
      // little cinematic delay like the reference
      setTimeout(() => setStep("issue"), staffOnline ? 650 : 950);
      return;
    }

    // issue -> send first message -> ready
    if (step === "issue") {
      const v = input.trim();
      if (!v) return;

      setIsSending(true);
      setInput("");
      try {
        await setTyping(convId, "user", false);
        await sendSupportMessage(convId, "user", v);

        // keep local thread updated
        upsertLocalThread({
          id: convId,
          category,
          email,
          name,
          lastMessageText: v,
          updatedAt: Date.now(),
        });

        setStep("ready");
      } finally {
        setIsSending(false);
      }
      return;
    }
  }

  async function handleSend() {
    if (isSending) return;
    if (!convId) return;
    const v = input.trim();
    if (!v) return;
    setIsSending(true);
    setInput("");
    try {
      await setTyping(convId, "user", false);
      await sendSupportMessage(convId, "user", v);

      upsertLocalThread({
        id: convId,
        lastMessageText: v,
        updatedAt: Date.now(),
      });
    } finally {
      setIsSending(false);
    }
  }

  async function handleChatSubmit() {
    if (step === "issue") {
      await handleOnboardAdvance();
      return;
    }
    if (step === "ready") {
      await handleSend();
    }
  }

  async function handleRatingSubmit() {
    if (!convId || !rating) return;
    await submitConversationRating(convId, rating, feedback.trim());
    setFeedback("");
    setRatingSent(true);
  }

  async function openThread(threadId: string) {
    if (!threadId) return;
    setConvId(threadId);
    wireConversationListeners(threadId);
    openWidgetTo("chat");
  }

  const headerStatusText = useMemo(() => {
    if (staffOnline) return "Online now";
    return "Offline";
  }, [staffOnline]);

  const headerSubText = useMemo(() => {
    if (tab === "home") return prettyWait(staffOnline);
    if (tab === "news") return "Live updates & announcements";
    if (tab === "messages") return "Your recent conversations";
    return staffOnline ? "A support agent can jump in any time" : "Leave a message — we’ll reply by email";
  }, [tab, staffOnline]);

  /** -------------------- UI Building Blocks -------------------- */

  function Pill(props: { children: any; tone?: "soft" | "solid"; onClick?: () => void }) {
    const cls =
      props.tone === "solid"
        ? "bg-white text-black"
        : "bg-white/10 text-white border border-white/10";
    const base =
      "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide";
    if (props.onClick) {
      return (
        <button onClick={props.onClick} className={`${base} ${cls} hover:opacity-90 transition`}>
          {props.children}
        </button>
      );
    }
    return <span className={`${base} ${cls}`}>{props.children}</span>;
  }

  function PrimaryButton(props: {
    icon?: any;
    title: string;
    subtitle?: string;
    onClick?: () => void;
    rightIcon?: any;
  }) {
    return (
      <button
        onClick={props.onClick}
        className="w-full text-left rounded-3xl bg-white/7 hover:bg-white/10 border border-white/10 px-5 py-4 transition"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {props.icon ? (
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                {props.icon}
              </div>
            ) : null}
            <div>
              <div className="font-semibold text-base">{props.title}</div>
              {props.subtitle ? <div className="text-sm text-white/60 mt-0.5">{props.subtitle}</div> : null}
            </div>
          </div>
          <div className="text-white/70">{props.rightIcon ?? <IconChevronRight className="w-5 h-5" />}</div>
        </div>
      </button>
    );
  }

  function SectionTitle(props: { children: any }) {
    return (
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/50 px-1">
        <span>{props.children}</span>
      </div>
    );
  }

  /** -------------------- Tab Screens -------------------- */

  function HomeScreen() {
    const recent = threads[0];
    const hasRecent = !!recent?.id;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Pill>Live signals · AI insights · Risk controls</Pill>
          <Pill tone="soft">{staffOnline ? "Support Online" : "Support Offline"}</Pill>
        </div>

        <div className="rounded-[28px] bg-white/5 border border-white/10 p-5">
          <div className="text-2xl font-semibold leading-tight">
            Hi{(name || convMeta?.name) ? ` ${name || convMeta?.name}` : ""} 👋
          </div>
          <div className="text-white/60 mt-2 text-sm leading-relaxed">
            {staffOnline
              ? "We’re here. Send a message and we’ll jump in."
              : "Leave a message — we’ll reply as soon as we’re back online."}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Pill tone="soft">{prettyWait(staffOnline)}</Pill>
            <Pill tone="soft">Category: {category || convMeta?.category || "General"}</Pill>
          </div>
        </div>

        {hasRecent && (
          <>
            <SectionTitle>Recent message</SectionTitle>
            <button
              onClick={() => openThread(recent.id)}
              className="w-full text-left rounded-3xl bg-white/7 hover:bg-white/10 border border-white/10 px-5 py-4 transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
                  <img
                    src="https://i.pravatar.cc/120?img=12"
                    className="w-full h-full object-cover"
                    alt="avatar"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {recent.category || "Support"}{" "}
                    <span className="text-white/50 font-normal">· {shortTimeAgo(recent.updatedAt || 0)}</span>
                  </div>
                  <div className="text-sm text-white/60 truncate">
                    {recent.lastMessageText || "Open conversation"}
                  </div>
                </div>
                <div className="text-white/60">
                  <IconChevronRight />
                </div>
              </div>
            </button>
          </>
        )}

        <SectionTitle>Quick actions</SectionTitle>

        <PrimaryButton
          icon={<IconChat className="w-5 h-5 text-white/90" />}
          title="Send us a message"
          subtitle={staffOnline ? "We’ll reply fast" : "We’ll be back online soon"}
          onClick={() => {
            // If onboarding not done, route to chat so they complete it
            setTab("chat");
          }}
          rightIcon={<IconChevronRight className="w-5 h-5" />}
        />

        <PrimaryButton
          icon={<IconNews className="w-5 h-5 text-white/90" />}
          title="View product updates"
          subtitle="Latest improvements and feature drops"
          onClick={() => setTab("news")}
          rightIcon={<IconChevronRight className="w-5 h-5" />}
        />
      </div>
    );
  }

  function MessagesScreen() {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
          <div className="text-sm text-white/70">
            Because your Firestore rules block conversation <span className="font-semibold">list</span> for users, this tab uses a{" "}
            <span className="font-semibold">local history cache</span> (safe + fast).
          </div>
        </div>

        {threads.length === 0 ? (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-center">
            <div className="text-lg font-semibold">No messages yet</div>
            <div className="text-white/60 mt-2">Start a chat and your conversations will show up here.</div>
            <button
              onClick={() => setTab("chat")}
              className="mt-4 px-5 py-3 rounded-2xl bg-blue-600 hover:opacity-95 font-semibold"
            >
              Start a chat
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                className="w-full text-left rounded-3xl bg-white/7 hover:bg-white/10 border border-white/10 px-5 py-4 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                    <IconInbox className="w-5 h-5 text-white/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold truncate">
                        {t.category || "General"}{" "}
                        {t.status === "resolved" ? <span className="text-xs text-white/50 font-normal">(Resolved)</span> : null}
                      </div>
                      <div className="text-xs text-white/50">{shortTimeAgo(t.updatedAt || 0)}</div>
                    </div>
                    <div className="text-sm text-white/60 truncate mt-1">
                      {t.lastMessageText || "Open conversation"}
                    </div>
                  </div>
                  <div className="text-white/60 mt-1">
                    <IconChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function NewsScreen() {
    return (
      <div className="space-y-4">
        {news.length === 0 ? (
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6 text-center">
            <div className="text-lg font-semibold">No news yet</div>
            <div className="text-white/60 mt-2">When you post to Firestore `/news`, updates show here instantly.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {news.map((n) => (
              <div key={n.id} className="rounded-3xl bg-white/7 border border-white/10 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-lg">{n.title}</div>
                  <Pill tone="soft">Update</Pill>
                </div>
                <div className="text-white/65 mt-2 leading-relaxed whitespace-pre-wrap">{n.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function ChatScreen() {
    return (
      <div className="space-y-5">
        {bootError && (
          <div className="p-5 rounded-3xl bg-red-950/40 border border-red-500/30 text-red-100 text-base">
            {bootError}
          </div>
        )}

        {/* banner after resolve */}
        {justResolved && (
          <div className="p-4 rounded-3xl bg-white/10 border border-white/10">
            <div className="font-semibold">Conversation resolved ✅</div>
            <div className="text-sm text-white/70">This thread is closed. Start a new conversation when you are ready.</div>
          </div>
        )}

        {isResolved && (
          <div className="p-4 rounded-3xl bg-white/8 border border-white/10">
            <div className="text-sm text-white/70 mb-3">This conversation is marked resolved.</div>
            <button
              onClick={startFreshConversation}
              className="w-full rounded-2xl bg-white text-black font-semibold hover:opacity-90 py-3"
            >
              Start a new conversation
            </button>
          </div>
        )}

        {/* transcript card (after resolve) */}
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

        {/* Messages area */}
        <div className="space-y-3 text-base overflow-y-auto pr-1">
          {msgs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 p-4 rounded-3xl max-w-[90%] text-lg"
            >
              Hi there! You’re speaking with StockHorizon support.
              <div className="mt-2 text-white/70">
                {step === "hello" || step === "name"
                  ? "First, who am I speaking with today?"
                  : step === "category"
                  ? "What can we help with today? Pick a category."
                  : step === "email"
                  ? "In case we get cut off — what’s the best email to reach you on?"
                  : step === "connecting"
                  ? "Connecting you with support…"
                  : step === "issue"
                  ? "Tell us what’s going on 👇"
                  : "You’re all set. Type your message below."}
              </div>
            </motion.div>
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

          {supportTyping && <div className="text-sm text-white/60 px-2">Support is typing…</div>}

          <div ref={bottomRef} />
        </div>

        {/* Onboarding + Input */}
        <div className="pt-1">
          {/* HELLO CTA */}
          {step === "hello" && (
            <div className="grid gap-3">
              <button
                onClick={() => setStep("name")}
                className="w-full rounded-3xl bg-white/7 hover:bg-white/10 border border-white/10 px-5 py-4 text-left transition"
              >
                <div className="font-semibold text-lg">I have a question</div>
                <div className="text-white/60 text-sm mt-1">We’ll route you to the right support person.</div>
              </button>
            </div>
          )}

          {/* NAME */}
          {step === "name" && (
            <div className="flex gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Type your name..."
                className="flex-1 rounded-2xl bg-white/10 p-4 outline-none text-lg border border-white/10 focus:border-white/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleOnboardAdvance();
                  }
                }}
              />
              <button
                onClick={handleOnboardAdvance}
                className="px-6 rounded-2xl bg-white text-black font-semibold hover:opacity-90 text-xl"
              >
                →
              </button>
            </div>
          )}

          {/* CATEGORY */}
          {step === "category" && (
            <div className="space-y-3">
              <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
                <div className="text-sm text-white/70">Select a category so we can route you faster:</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`px-4 py-2 rounded-full border transition text-sm font-semibold ${
                        category === c
                          ? "bg-blue-600 border-blue-500/50"
                          : "bg-white/5 border-white/10 hover:bg-white/8"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleOnboardAdvance}
                className="w-full rounded-2xl bg-white text-black font-semibold hover:opacity-90 py-4 text-lg"
              >
                Continue →
              </button>
            </div>
          )}

          {/* EMAIL */}
          {step === "email" && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Type your email..."
                  className="flex-1 rounded-2xl bg-white/10 p-4 outline-none text-lg border border-white/10 focus:border-white/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleOnboardAdvance();
                    }
                  }}
                />
                <button
                  onClick={handleOnboardAdvance}
                  className="px-6 rounded-2xl bg-white text-black font-semibold hover:opacity-90 text-xl"
                >
                  →
                </button>
              </div>

              <div className="text-xs text-white/50">
                Category: <span className="text-white/70 font-semibold">{category}</span>
              </div>
            </div>
          )}

          {/* CONNECTING */}
          {step === "connecting" && (
            <div className="rounded-3xl bg-white/7 border border-white/10 p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">Connecting you to support</div>
                <div className="text-sm text-white/60 mt-1">{prettyWait(staffOnline)}</div>
              </div>
              <motion.div
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 0.9, repeatType: "reverse" }}
                className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center"
                aria-label="Connecting"
              >
                <IconBolt className="w-5 h-5 text-white/80" />
              </motion.div>
            </div>
          )}

          {/* ISSUE / READY INPUT */}
          {!isResolved && (step === "issue" || step === "ready") && (
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={step === "issue" ? "Describe your issue… (Shift+Enter for new line)" : "Message… (Shift+Enter for new line)"}
                rows={1}
                className="flex-1 rounded-2xl bg-white/10 p-4 outline-none text-lg border border-white/10 focus:border-white/20 resize-none min-h-[58px] max-h-48"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleChatSubmit();
                  }
                }}
                onBlur={() => {
                  if (convId) setTyping(convId, "user", false).catch(() => {});
                }}
              />
              <button
                disabled={isSending || !convId || !input.trim()}
                onClick={() => void handleChatSubmit()}
                className="px-6 rounded-2xl bg-blue-600 text-white font-semibold hover:opacity-90 text-lg"
              >
                {isSending ? "Sending…" : "Send"}
              </button>
            </div>
          )}

          {/* Rating UI placeholder (you already have submitConversationRating) */}
          {isResolved && !ratingSent && (
            <div className="mt-4 rounded-3xl bg-white/5 border border-white/10 p-4">
              <div className="font-semibold">Rate your support experience</div>
              <div className="flex gap-2 mt-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={`w-10 h-10 rounded-2xl border ${
                      rating >= n ? "bg-blue-600 border-blue-500/50" : "bg-white/5 border-white/10 hover:bg-white/8"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional feedback…"
                className="mt-3 w-full rounded-2xl bg-white/10 border border-white/10 p-3 outline-none text-sm"
                rows={3}
              />
              <button
                onClick={handleRatingSubmit}
                className="mt-3 w-full rounded-2xl bg-white text-black font-semibold py-3 hover:opacity-90"
              >
                Submit
              </button>
            </div>
          )}

          {ratingSent && (
            <div className="mt-4 rounded-3xl bg-white/7 border border-white/10 p-4 text-white/70">
              Thanks! Your feedback helps us improve.
            </div>
          )}
        </div>
      </div>
    );
  }

  /** -------------------- Main Render -------------------- */

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => {
          setOpen(true);
          // match reference: open into home first, not chat
          setTab("home");
        }}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Open support chat"
      >
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-black shadow-2xl hover:scale-105 transition">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="w-7 h-7 opacity-90 group-hover:opacity-100 transition"
          >
            <path d="M2 12c0-4.418 4.03-8 9-8s9 3.582 9 8-4.03 8-9 8c-1.084 0-2.122-.14-3.09-.397L3 21l1.52-3.39C3.57 16.04 2 14.15 2 12z" />
          </svg>

          {/* unread bubble */}
          {unreadBadge > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center shadow">
              {unreadBadge}
            </span>
          )}
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
            <div className="relative flex-1 flex flex-col">
              <TechBackdrop />

              {/* Header */}
              <div className="relative p-6 border-b border-white/10 flex items-center justify-between">
                <button
                  onClick={() => {
                    // if on chat screen, go back to home like the reference
                    if (tab === "chat") setTab("home");
                  }}
                  className={`text-white/70 hover:text-white transition ${tab === "chat" ? "" : "opacity-0 pointer-events-none"}`}
                  aria-label="Back"
                >
                  ←
                </button>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src="https://i.pravatar.cc/120?img=68" className="w-12 h-12 rounded-full" alt="avatar" />
                    <motion.span
                      animate={{ opacity: staffOnline ? [0.6, 1, 0.6] : 1 }}
                      transition={{ repeat: staffOnline ? Infinity : 0, duration: 1.4 }}
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black ${
                        staffOnline ? "bg-green-400" : "bg-gray-500"
                      }`}
                    />
                  </div>

                  <div>
                    <div className="font-semibold text-lg">StockHorizon</div>
                    <div className="text-sm text-gray-400">{headerStatusText}</div>
                  </div>
                </div>

                <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white" aria-label="Close support">
                  <IconClose className="w-6 h-6" />
                </button>
              </div>

              {/* Subheader */}
              <div className="relative px-6 pt-4 pb-3">
                <div className="text-xs text-white/50">{headerSubText}</div>
              </div>

              {/* Body */}
              <div
                className="relative flex-1 overflow-y-scroll px-6 pb-6 support-scroll"
                style={{ scrollbarGutter: "stable", scrollbarWidth: "thin" }}
              >
                <div className="absolute top-3 bottom-3 right-1.5 w-[3px] rounded-full bg-white/15 pointer-events-none" />
                <AnimatePresence mode="wait">
                  {tab === "home" && (
                    <motion.div
                      key="home"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="pt-3"
                    >
                      <HomeScreen />
                    </motion.div>
                  )}

                  {tab === "messages" && (
                    <motion.div
                      key="messages"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="pt-3"
                    >
                      <MessagesScreen />
                    </motion.div>
                  )}

                  {tab === "news" && (
                    <motion.div
                      key="news"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="pt-3"
                    >
                      <NewsScreen />
                    </motion.div>
                  )}

                  {tab === "chat" && (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="pt-3"
                    >
                      <ChatScreen />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Tabs */}
              <div className="relative border-t border-white/10 grid grid-cols-3 text-center text-lg">
                <button
                  onClick={() => setTab("home")}
                  className={`py-5 hover:bg-white/5 transition ${tab === "home" ? "bg-white/5" : ""}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <IconInbox className="w-5 h-5 text-white/80" />
                    <span>Home</span>
                  </div>
                </button>

                <button
                  onClick={() => setTab("messages")}
                  className={`py-5 hover:bg-white/5 transition ${tab === "messages" ? "bg-white/5" : ""}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <IconChat className="w-5 h-5 text-white/80" />
                    <span>Messages</span>
                  </div>
                </button>

                <button
                  onClick={() => setTab("news")}
                  className={`py-5 hover:bg-white/5 transition ${tab === "news" ? "bg-white/5" : ""}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <IconNews className="w-5 h-5 text-white/80" />
                    <span>News</span>
                  </div>
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <button
          onClick={() => setOpen(false)}
          className="fixed bottom-28 right-4 z-[60] w-12 h-12 rounded-full border border-white/20 bg-black/75 hover:bg-black/90 text-white/90 hover:text-white transition flex items-center justify-center shadow-xl"
          aria-label="Collapse support"
        >
          <IconChevronDown className="w-6 h-6" />
        </button>
      )}

      <style jsx global>{`
        .support-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .support-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.35);
          border-radius: 999px;
          border: 2px solid rgba(0, 0, 0, 0.45);
        }
        .support-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </>
  );
}
