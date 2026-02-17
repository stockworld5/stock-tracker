"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
  listenNews,
  postNews,
  deleteNews,
  Conversation,
  ChatMessage,
  NewsItem,
} from "@/lib/support-chat";
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";

/* =======================================================================================
   Admin Support Desk (single-file page)
   - No emojis
   - All vectors
   - Tech look + more features
   - Uses existing Firestore rules (admin can update anything on conversations)
======================================================================================= */

/* -------------------------------- Icons (inline SVG) -------------------------------- */

function Icon({ children, className = "w-4 h-4" }: { children: any; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

const I = {
  Search: (p?: { className?: string }) => (
    <Icon className={p?.className ?? "w-4 h-4"}>
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  ),
  SignOut: (p?: { className?: string }) => (
    <Icon className={p?.className ?? "w-4 h-4"}>
      <path d="M10 7V6a3 3 0 0 1 3-3h6v18h-6a3 3 0 0 1-3-3v-1" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 8l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  ),
  Bolt: (p?: { className?: string }) => (
    <Icon className={p?.className ?? "w-4 h-4"}>
      <path
        d="M13 2 3 14h7l-1 8 12-14h-8V2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Icon>
  ),
  Check: (p?: { className?: string }) => (
    <Icon className={p?.className ?? "w-4 h-4"}>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  ),
  X: (p?: { className?: string }) => (
    <Icon className={p?.className ?? "w-4 h-4"}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </Icon>
  ),
  Tag: (p?: { className?: string }) => (
    <Icon className={p?.className ?? "w-4 h-4"}>
      <path d="M3 12l9 9 9-9-9-9H3v9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7.5 7.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </Icon>
  ),
  Clock: (p?: { className?: string }) => (
    <Icon className={p?.className ?? "w-4 h-4"}>
      <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  ),
  Shield: (p?: { className?: string }) => (
    <Icon className={p?.className ?? "w-4 h-4"}>
      <path
        d="M12 2 20 6v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9.5 12l1.8 1.8L14.8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  ),
  News: (p?: { className?: string }) => (
    <Icon className={p?.className ?? "w-4 h-4"}>
      <path d="M6 4h12v16H6V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 8h8M8 12h8M8 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Icon>
  ),
  Chat: (p?: { className?: string }) => (
    <Icon className={p?.className ?? "w-4 h-4"}>
      <path
        d="M21 12c0 4.418-4.03 8-9 8-1.084 0-2.122-.14-3.09-.397L3 21l1.52-3.39C3.57 16.04 2 14.15 2 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </Icon>
  ),
  Filter: (p?: { className?: string }) => (
    <Icon className={p?.className ?? "w-4 h-4"}>
      <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </Icon>
  ),
};

/* -------------------------------- Helpers -------------------------------- */

const CATEGORIES = ["General", "Billing", "Bug", "Feature Request", "Account", "Other"] as const;
type Category = (typeof CATEGORIES)[number];

function toMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  if (typeof ts?.seconds === "number") return ts.seconds * 1000;
  return 0;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function timeAgo(ms: number) {
  if (!ms) return "";
  const d = Date.now() - ms;
  if (d < 60_000) return "now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

function needsReply(c: Conversation) {
  const unread = Number(c.unreadForAdmin ?? 0) || 0;
  const lastUser = toMillis((c as any).lastUserMessageAt);
  const lastSupport = toMillis((c as any).lastSupportMessageAt);
  return unread > 0 || lastUser > lastSupport;
}

/** Admin-only optional fields stored on conversation doc (no rules changes needed) */
type AdminMeta = {
  labelColor?: string; // one of palette keys
  adminNote?: string;
  adminBlocked?: boolean; // "blacklisted"
  snoozedUntil?: any; // Firestore timestamp
  hardClosed?: boolean; // hides from default open views if true
};

const COLOR_PALETTE: Array<{ key: string; name: string; dot: string; ring: string; softBg: string }> = [
  { key: "slate", name: "Slate", dot: "bg-slate-500", ring: "ring-slate-400/40", softBg: "bg-slate-500/10" },
  { key: "blue", name: "Blue", dot: "bg-blue-500", ring: "ring-blue-400/40", softBg: "bg-blue-500/10" },
  { key: "cyan", name: "Cyan", dot: "bg-cyan-500", ring: "ring-cyan-400/40", softBg: "bg-cyan-500/10" },
  { key: "emerald", name: "Emerald", dot: "bg-emerald-500", ring: "ring-emerald-400/40", softBg: "bg-emerald-500/10" },
  { key: "amber", name: "Amber", dot: "bg-amber-500", ring: "ring-amber-400/40", softBg: "bg-amber-500/10" },
  { key: "orange", name: "Orange", dot: "bg-orange-500", ring: "ring-orange-400/40", softBg: "bg-orange-500/10" },
  { key: "red", name: "Red", dot: "bg-red-500", ring: "ring-red-400/40", softBg: "bg-red-500/10" },
  { key: "pink", name: "Pink", dot: "bg-pink-500", ring: "ring-pink-400/40", softBg: "bg-pink-500/10" },
  { key: "violet", name: "Violet", dot: "bg-violet-500", ring: "ring-violet-400/40", softBg: "bg-violet-500/10" },
  { key: "indigo", name: "Indigo", dot: "bg-indigo-500", ring: "ring-indigo-400/40", softBg: "bg-indigo-500/10" },
];

function paletteByKey(k?: string) {
  return COLOR_PALETTE.find((x) => x.key === (k || "")) ?? COLOR_PALETTE[0];
}

async function addSystemMessage(convId: string, text: string) {
  // Allowed by your rules: admin can create system messages.
  await addDoc(collection(db, "conversations", convId, "messages"), {
    role: "system",
    text,
    createdAt: serverTimestamp(),
  });
}

/* -------------------------------- UI bits -------------------------------- */

function TechShell({ children }: { children: any }) {
  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute top-20 -right-40 w-[560px] h-[560px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-40 w-[560px] h-[560px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(255,255,255,0.45) 0px, rgba(255,255,255,0.45) 1px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 7px)",
          }}
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: any; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_20px_70px_rgba(0,0,0,0.45)] ${className}`}>
      {children}
    </div>
  );
}

function Pill({
  children,
  tone = "soft",
  onClick,
  active,
}: {
  children: any;
  tone?: "soft" | "solid";
  onClick?: () => void;
  active?: boolean;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border transition select-none";
  const soft = `border-white/10 bg-white/5 text-white/80 hover:bg-white/8 ${active ? "ring-2 ring-blue-400/40" : ""}`;
  const solid = `border-white/10 bg-white text-black hover:opacity-95 ${active ? "ring-2 ring-blue-400/40" : ""}`;
  return onClick ? (
    <button onClick={onClick} className={`${base} ${tone === "solid" ? solid : soft}`}>
      {children}
    </button>
  ) : (
    <span className={`${base} ${tone === "solid" ? solid : soft}`}>{children}</span>
  );
}

function SectionTitle({ left, right }: { left: any; right?: any }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs uppercase tracking-[0.25em] text-white/45">{left}</div>
      {right ? <div className="text-xs text-white/45">{right}</div> : null}
    </div>
  );
}

/* =======================================================================================
   Page
======================================================================================= */

type View = "inbox" | "news" | "settings";

export default function AdminChatPage() {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [rows, setRows] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<Conversation | null>(null);

  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const [presenceOn, setPresenceOn] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // News
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");

  // Desk controls
  const [view, setView] = useState<View>("inbox");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"open" | "resolved" | "all">("open");
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");
  const [filterNeedsReply, setFilterNeedsReply] = useState(false);
  const [filterColor, setFilterColor] = useState<string | "All">("All");
  const [hideBlocked, setHideBlocked] = useState(false);
  const [hideSnoozed, setHideSnoozed] = useState(false);

  const live = (selectedMeta ?? selected) as (Conversation & AdminMeta) | null;

  const userTyping = useMemo(() => {
    const ms = toMillis((selectedMeta as any)?.typingUserAt);
    return ms > 0 && Date.now() - ms < 8000;
  }, [(selectedMeta as any)?.typingUserAt]);

  /* ---------- auth ---------- */
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

  /* ---------- presence heartbeat ---------- */
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

  /* ---------- inbox + news ---------- */
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = listenConversations(setRows);
    return () => unsub();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = listenNews(setNews);
    return () => unsub();
  }, [isAdmin]);

  /* ---------- selected conversation listeners ---------- */
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  /* ---------- typing debounce for support ---------- */
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

  /* ---------- keyboard shortcuts ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // avoid hijacking typing in inputs/textareas
      const tag = (e.target as any)?.tagName?.toLowerCase?.() ?? "";
      if (tag === "input" || tag === "textarea" || (e.target as any)?.isContentEditable) return;

      // J/K navigate list
      if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        selectRelative(1);
      } else if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        selectRelative(-1);
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        if (selected?.id) resolveTicket(selected.id).catch(() => {});
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (selected?.id) reopenTicket(selected.id).catch(() => {});
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (selected?.id) snoozeTicket(selected.id, 30).catch(() => {}); // 30 min default
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, rows, search, filterStatus, filterCategory, filterNeedsReply, filterColor, hideBlocked, hideSnoozed]);

  /* ---------- Derived lists ---------- */

  const nowMs = Date.now();

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    return rows
      .filter((r) => {
        // status filter
        if (filterStatus !== "all" && r.status !== filterStatus) return false;

        // category filter
        if (filterCategory !== "All" && (r.category || "General") !== filterCategory) return false;

        // needs-reply
        if (filterNeedsReply && !needsReply(r)) return false;

        // color filter
        const color = (r as any).labelColor as string | undefined;
        if (filterColor !== "All" && (color || "slate") !== filterColor) return false;

        // blocked filter
        const blocked = !!(r as any).adminBlocked;
        if (hideBlocked && blocked) return false;

        // snoozed filter
        const snoozedUntil = toMillis((r as any).snoozedUntil);
        const snoozed = snoozedUntil > nowMs;
        if (hideSnoozed && snoozed) return false;

        // search
        if (!s) return true;
        const hay =
          `${r.name || ""} ${r.email || ""} ${r.lastMessageText || ""} ${r.category || ""}`.toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => {
        // priority sort:
        // 1) needs reply
        // 2) unreadForAdmin desc
        // 3) snoozed last
        // 4) updatedAt desc
        const aNeeds = needsReply(a) ? 1 : 0;
        const bNeeds = needsReply(b) ? 1 : 0;
        if (aNeeds !== bNeeds) return bNeeds - aNeeds;

        const aUnread = Number(a.unreadForAdmin ?? 0) || 0;
        const bUnread = Number(b.unreadForAdmin ?? 0) || 0;
        if (aUnread !== bUnread) return bUnread - aUnread;

        const aSnoozed = toMillis((a as any).snoozedUntil) > nowMs ? 1 : 0;
        const bSnoozed = toMillis((b as any).snoozedUntil) > nowMs ? 1 : 0;
        if (aSnoozed !== bSnoozed) return aSnoozed - bSnoozed;

        const au = toMillis(a.updatedAt);
        const bu = toMillis(b.updatedAt);
        return bu - au;
      });
  }, [
    rows,
    search,
    filterStatus,
    filterCategory,
    filterNeedsReply,
    filterColor,
    hideBlocked,
    hideSnoozed,
    nowMs,
  ]);

  const grouped = useMemo(() => {
    const needs: Conversation[] = [];
    const open: Conversation[] = [];
    const resolved: Conversation[] = [];

    filtered.forEach((c) => {
      const hardClosed = !!(c as any).hardClosed;
      if (hardClosed) {
        // hard closed behaves like resolved for display (but separate flag)
        resolved.push(c);
        return;
      }
      if (c.status === "resolved") resolved.push(c);
      else if (needsReply(c)) needs.push(c);
      else open.push(c);
    });

    return { needs, open, resolved };
  }, [filtered]);

  const stats = useMemo(() => {
    const open = rows.filter((r) => r.status === "open").length;
    const resolved = rows.filter((r) => r.status === "resolved").length;
    const needs = rows.filter((r) => r.status === "open" && needsReply(r)).length;
    return { open, resolved, needs, total: rows.length };
  }, [rows]);

  function selectRelative(delta: number) {
    if (filtered.length === 0) return;
    if (!selected) {
      setSelected(filtered[0]);
      return;
    }
    const idx = filtered.findIndex((x) => x.id === selected.id);
    const next = filtered[clamp(idx + delta, 0, filtered.length - 1)];
    if (next) setSelected(next);
  }

  /* ---------- Ticket actions (admin-only fields) ---------- */

  async function setAdminFields(convId: string, patch: Partial<AdminMeta>) {
    await updateDoc(doc(db, "conversations", convId), {
      ...patch,
      updatedAt: serverTimestamp(),
    } as any);
  }

  async function resolveTicket(convId: string) {
    await resolveConversation(convId);
  }

  async function reopenTicket(convId: string) {
    await reopenConversation(convId);
  }

  async function hardCloseTicket(convId: string) {
    // hard close: mark resolved + hardClosed flag (hidden from default workflows)
    await updateDoc(doc(db, "conversations", convId), {
      status: "resolved",
      hardClosed: true,
      updatedAt: serverTimestamp(),
    } as any);
    await addSystemMessage(convId, "Support hard-closed this ticket.");
  }

  async function blacklistTicket(convId: string, on: boolean) {
    await setAdminFields(convId, { adminBlocked: on });
    await addSystemMessage(convId, on ? "Support flagged this conversation as blocked." : "Support removed blocked flag.");
  }

  async function snoozeTicket(convId: string, minutes: number) {
    const until = Date.now() + minutes * 60_000;
    // Store as JS Date; Firestore client converts to timestamp
    await setAdminFields(convId, { snoozedUntil: new Date(until) as any });
    await addSystemMessage(convId, `Support snoozed this ticket for ${minutes} minutes.`);
  }

  async function clearSnooze(convId: string) {
    await setAdminFields(convId, { snoozedUntil: null as any });
    await addSystemMessage(convId, "Support removed snooze.");
  }

  async function setTicketColor(convId: string, key: string) {
    await setAdminFields(convId, { labelColor: key });
  }

  async function setAdminNote(convId: string, note: string) {
    await setAdminFields(convId, { adminNote: note });
  }

  async function clearHardClosed(convId: string) {
    await setAdminFields(convId, { hardClosed: false });
    await addSystemMessage(convId, "Support removed hard-closed flag.");
  }

  /* ---------- Send message ---------- */

  async function send() {
    if (!selected) return;
    const v = reply.trim();
    if (!v) return;

    setReply("");
    await setTyping(selected.id, "support", false).catch(() => {});
    await sendSupportMessage(selected.id, "support", v);

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      setPresenceOn(false);
      await setSupportPresence(false).catch(() => {});
      await signOut(auth);
    } catch {
      setSigningOut(false);
    }
  }

  /* ---------- Guards ---------- */

  if (!ready) return <div className="p-8 text-white">Loading…</div>;

  if (!auth.currentUser) {
    return (
      <TechShell>
        <div className="p-10">
          <div className="text-2xl font-semibold">Admin Desk</div>
          <div className="text-white/60 mt-2">Please sign in first.</div>
        </div>
      </TechShell>
    );
  }

  if (!isAdmin) {
    return (
      <TechShell>
        <div className="p-10">
          <div className="text-2xl font-semibold">Admin Desk</div>
          <div className="text-white/60 mt-2">
            You’re signed in, but not an admin. Create doc <span className="font-semibold">admins/{auth.currentUser.uid}</span>.
          </div>
        </div>
      </TechShell>
    );
  }

  /* =======================================================================================
     Render
  ======================================================================================= */

  return (
    <TechShell>
      <div className="h-screen grid grid-cols-[420px_1fr]">
        {/* ========================= LEFT: Inbox ========================= */}
        <div className="border-r border-white/10 bg-black/20">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-semibold tracking-tight">Support Desk</div>
                <div className="text-xs text-white/50 mt-1">
                  {stats.needs} needs reply • {stats.open} open • {stats.resolved} resolved • {stats.total} total
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Pill
                  active={presenceOn}
                  onClick={async () => {
                    const next = !presenceOn;
                    setPresenceOn(next);
                    await setSupportPresence(next).catch(() => {});
                  }}
                >
                  <I.Bolt className="w-4 h-4" />
                  {presenceOn ? "Online" : "Offline"}
                </Pill>

                <Pill
                  tone="soft"
                  onClick={handleSignOut}
                >
                  <I.SignOut className="w-4 h-4" />
                  {signingOut ? "Signing out…" : "Sign out"}
                </Pill>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                  <I.Search className="w-4 h-4" />
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, text…"
                  className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-white/20"
                />
              </div>

              <Pill onClick={() => setView(view === "inbox" ? "news" : "inbox")} active={view === "news"}>
                <I.News className="w-4 h-4" />
                News
              </Pill>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill onClick={() => setFilterStatus("open")} active={filterStatus === "open"}>
                Open
              </Pill>
              <Pill onClick={() => setFilterStatus("resolved")} active={filterStatus === "resolved"}>
                Resolved
              </Pill>
              <Pill onClick={() => setFilterStatus("all")} active={filterStatus === "all"}>
                All
              </Pill>

              <Pill onClick={() => setFilterNeedsReply((v) => !v)} active={filterNeedsReply}>
                <I.Filter className="w-4 h-4" />
                Needs reply
              </Pill>

              <Pill onClick={() => setHideSnoozed((v) => !v)} active={hideSnoozed}>
                <I.Clock className="w-4 h-4" />
                Hide snoozed
              </Pill>

              <Pill onClick={() => setHideBlocked((v) => !v)} active={hideBlocked}>
                <I.Shield className="w-4 h-4" />
                Hide blocked
              </Pill>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
              >
                <option value="All">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={filterColor}
                onChange={(e) => setFilterColor(e.target.value)}
                className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
              >
                <option value="All">All colors</option>
                {COLOR_PALETTE.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 text-[11px] text-white/40">
              Shortcuts: J/K navigate • R resolve • E reopen • S snooze
            </div>
          </div>

          <div className="p-4 overflow-y-auto h-[calc(100vh-248px)]">
            <div className="space-y-5">
              {/* Group: Needs reply */}
              <div>
                <SectionTitle left="Needs reply" right={`${grouped.needs.length}`} />
                <div className="mt-2 space-y-2">
                  {grouped.needs.map((c) => (
                    <TicketRow key={c.id} c={c} selectedId={selected?.id} onSelect={() => setSelected(c)} />
                  ))}
                  {grouped.needs.length === 0 && (
                    <div className="text-sm text-white/40 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      No conversations need replies.
                    </div>
                  )}
                </div>
              </div>

              {/* Group: Open */}
              <div>
                <SectionTitle left="Open" right={`${grouped.open.length}`} />
                <div className="mt-2 space-y-2">
                  {grouped.open.map((c) => (
                    <TicketRow key={c.id} c={c} selectedId={selected?.id} onSelect={() => setSelected(c)} />
                  ))}
                </div>
              </div>

              {/* Group: Resolved */}
              <div>
                <SectionTitle left="Resolved" right={`${grouped.resolved.length}`} />
                <div className="mt-2 space-y-2">
                  {grouped.resolved.map((c) => (
                    <TicketRow key={c.id} c={c} selectedId={selected?.id} onSelect={() => setSelected(c)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================= RIGHT: Panel ========================= */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {view === "news" ? (
              <motion.div
                key="news"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                transition={{ duration: 0.18 }}
              >
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <I.News className="w-5 h-5 text-white/80" />
                      <div className="text-lg font-semibold">Announcements</div>
                    </div>
                    <Pill onClick={() => setView("inbox")}>
                      <I.Chat className="w-4 h-4" />
                      Back to inbox
                    </Pill>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <input
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      placeholder="Title"
                      className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/20"
                    />
                    <button
                      onClick={async () => {
                        await postNews(newsTitle, newsBody);
                        setNewsTitle("");
                        setNewsBody("");
                      }}
                      className="rounded-xl bg-white text-black font-semibold text-sm hover:opacity-95 transition"
                    >
                      Post announcement
                    </button>
                  </div>

                  <textarea
                    value={newsBody}
                    onChange={(e) => setNewsBody(e.target.value)}
                    placeholder="Body (shows in widget News tab)…"
                    className="mt-3 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none min-h-[120px] focus:border-white/20"
                  />

                  <div className="mt-5 space-y-3">
                    {news.map((n) => (
                      <div key={n.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold">{n.title}</div>
                          <div className="text-sm text-white/70 whitespace-pre-wrap mt-1">{n.body}</div>
                        </div>
                        <button
                          onClick={() => deleteNews(n.id)}
                          className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm transition"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                    {news.length === 0 && <div className="text-sm text-white/50">No announcements yet.</div>}
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div
                key="desk"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                {!selected ? (
                  <GlassCard className="p-8">
                    <div className="text-lg font-semibold">Select a ticket</div>
                    <div className="text-white/60 mt-2">
                      Pick a conversation from the left to view messages, apply colors, snooze, blacklist, and reply.
                    </div>
                  </GlassCard>
                ) : (
                  <>
                    {/* Header */}
                    <GlassCard className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${
                                needsReply(selected) ? "bg-red-500" : "bg-white/30"
                              }`}
                            />
                            <div className="text-xl font-semibold truncate">{live?.name || "User"}</div>
                            <Pill>
                              {(live?.category || "General") as string}
                            </Pill>
                            {!!(live as any)?.adminBlocked && (
                              <Pill>
                                <I.Shield className="w-4 h-4" />
                                Blocked
                              </Pill>
                            )}
                            {toMillis((live as any)?.snoozedUntil) > Date.now() && (
                              <Pill>
                                <I.Clock className="w-4 h-4" />
                                Snoozed
                              </Pill>
                            )}
                            {!!(live as any)?.hardClosed && (
                              <Pill>
                                <I.X className="w-4 h-4" />
                                Closed
                              </Pill>
                            )}
                          </div>

                          <div className="text-sm text-white/60 mt-2 truncate">
                            {live?.email || "No email"} • Ticket ID: <span className="text-white/50">{live?.id}</span>
                          </div>

                          <div className="text-xs text-white/45 mt-2">
                            Updated {timeAgo(toMillis(live?.updatedAt))} • Unread: {Number(live?.unreadForAdmin ?? 0) || 0}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <select
                            value={(live?.category || "General") as string}
                            onChange={async (e) => setConversationCategory(selected.id, e.target.value)}
                            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>

                          {live?.status === "open" ? (
                            <button
                              onClick={() => resolveTicket(selected.id)}
                              className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:opacity-95 transition inline-flex items-center gap-2"
                            >
                              <I.Check className="w-4 h-4" />
                              Resolve
                            </button>
                          ) : (
                            <button
                              onClick={() => reopenTicket(selected.id)}
                              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-semibold transition inline-flex items-center gap-2"
                            >
                              <I.Chat className="w-4 h-4" />
                              Reopen
                            </button>
                          )}

                          <button
                            onClick={() => hardCloseTicket(selected.id)}
                            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-semibold transition inline-flex items-center gap-2"
                            title="Hard close hides the ticket from most workflows"
                          >
                            <I.X className="w-4 h-4" />
                            Close
                          </button>
                        </div>
                      </div>

                      {/* Controls row */}
                      <div className="mt-4 grid grid-cols-[1fr_1fr_1fr] gap-3">
                        <GlassCard className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                              <I.Tag className="w-4 h-4" />
                              Ticket color
                            </div>
                            <div className="text-xs text-white/45">10 options</div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {COLOR_PALETTE.map((c) => {
                              const active = ((live as any)?.labelColor || "slate") === c.key;
                              return (
                                <button
                                  key={c.key}
                                  onClick={() => setTicketColor(selected.id, c.key)}
                                  className={`w-8 h-8 rounded-xl border border-white/10 ${c.softBg} ring-1 ${active ? `ring-2 ${c.ring}` : "ring-white/10"} hover:ring-white/20 transition relative`}
                                  title={c.name}
                                >
                                  <span className={`absolute inset-0 m-auto w-2.5 h-2.5 rounded-full ${c.dot}`} />
                                </button>
                              );
                            })}
                          </div>
                        </GlassCard>

                        <GlassCard className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                              <I.Clock className="w-4 h-4" />
                              Snooze / Timeout
                            </div>
                            <div className="text-xs text-white/45">Pause queue</div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Pill onClick={() => snoozeTicket(selected.id, 15)}>15m</Pill>
                            <Pill onClick={() => snoozeTicket(selected.id, 30)}>30m</Pill>
                            <Pill onClick={() => snoozeTicket(selected.id, 60)}>1h</Pill>
                            <Pill onClick={() => snoozeTicket(selected.id, 240)}>4h</Pill>
                            <Pill onClick={() => clearSnooze(selected.id)}>Clear</Pill>
                          </div>

                          {toMillis((live as any)?.snoozedUntil) > Date.now() && (
                            <div className="text-xs text-white/55 mt-3">
                              Snoozed until {new Date(toMillis((live as any)?.snoozedUntil)).toLocaleString()}
                            </div>
                          )}
                        </GlassCard>

                        <GlassCard className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                              <I.Shield className="w-4 h-4" />
                              Blacklist / Block
                            </div>
                            <div className="text-xs text-white/45">Flag</div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Pill
                              active={!!(live as any)?.adminBlocked}
                              onClick={() => blacklistTicket(selected.id, !((live as any)?.adminBlocked))}
                            >
                              Toggle blocked
                            </Pill>

                            {!!(live as any)?.hardClosed && (
                              <Pill onClick={() => clearHardClosed(selected.id)}>Unclose</Pill>
                            )}
                          </div>

                          <div className="text-xs text-white/45 mt-3">
                            Blocked is a desk-level flag. If you want it to prevent future chats, we’ll also add a
                            blacklist check in the widget creation step.
                          </div>
                        </GlassCard>
                      </div>

                      {/* Admin note */}
                      <div className="mt-4">
                        <div className="text-sm font-semibold text-white/80">Internal note</div>
                        <textarea
                          value={String((live as any)?.adminNote ?? "")}
                          onChange={(e) => setSelectedMeta((prev) => ({ ...(prev as any), adminNote: e.target.value }))}
                          onBlur={() => setAdminNote(selected.id, String((live as any)?.adminNote ?? ""))}
                          placeholder="Visible to admins only. Saved on blur."
                          className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none min-h-[90px] focus:border-white/20"
                        />
                      </div>
                    </GlassCard>

                    {/* Chat */}
                    <GlassCard className="overflow-hidden">
                      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                        <div className="text-sm font-semibold text-white/80">Conversation</div>
                        <div className="text-xs text-white/45">
                          {userTyping ? "User typing…" : " "}
                        </div>
                      </div>

                      <div className="h-[52vh] overflow-y-auto p-5 space-y-3 bg-black/10">
                        <AnimatePresence initial={false}>
                          {msgs.map((m) => (
                            <motion.div
                              key={m.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                                m.role === "support"
                                  ? "ml-auto bg-white text-black border-white/20"
                                  : m.role === "user"
                                  ? "bg-white/5 border-white/10 text-white"
                                  : "bg-white/3 border-white/10 text-white/70"
                              }`}
                            >
                              {m.text}
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        <div ref={bottomRef} />
                      </div>

                      <div className="p-5 border-t border-white/10 bg-black/10">
                        <div className="flex gap-3">
                          <input
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder="Reply as support…"
                            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/20"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                send();
                              }
                            }}
                            onBlur={() => selected && setTyping(selected.id, "support", false).catch(() => {})}
                          />
                          <button
                            onClick={send}
                            className="rounded-xl bg-blue-600 text-white font-semibold px-5 text-sm hover:opacity-95 transition"
                          >
                            Send
                          </button>
                        </div>

                        <div className="text-[11px] text-white/40 mt-3">
                          Tip: Use Resolve/Reopen/Close to generate system audit messages automatically.
                        </div>
                      </div>
                    </GlassCard>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TechShell>
  );
}

/* =======================================================================================
   Ticket Row Component
======================================================================================= */

function TicketRow({
  c,
  selectedId,
  onSelect,
}: {
  c: Conversation;
  selectedId?: string;
  onSelect: () => void;
}) {
  const selected = selectedId === c.id;

  const color = paletteByKey((c as any).labelColor);
  const snoozedUntil = toMillis((c as any).snoozedUntil);
  const snoozed = snoozedUntil > Date.now();
  const blocked = !!(c as any).adminBlocked;
  const hardClosed = !!(c as any).hardClosed;

  const unread = clamp(Number(c.unreadForAdmin ?? 0) || 0, 0, 99);
  const needs = needsReply(c);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border transition overflow-hidden ${
        selected
          ? "border-white/20 bg-white/10"
          : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/15"
      }`}
    >
      <div className="flex">
        {/* color bar */}
        <div className={`w-1.5 ${color.dot}`} />

        <div className="flex-1 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${needs ? "bg-red-500" : "bg-white/25"}`} />
                <div className="font-semibold truncate">{c.name || "User"}</div>
                {blocked && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70">
                    Blocked
                  </span>
                )}
                {snoozed && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70">
                    Snoozed
                  </span>
                )}
                {hardClosed && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70">
                    Closed
                  </span>
                )}
              </div>

              <div className="text-xs text-white/50 truncate mt-1">{c.email || "No email"}</div>
              <div className="text-sm text-white/80 truncate mt-2">{c.lastMessageText || "No messages yet"}</div>

              <div className="text-xs text-white/45 mt-2 flex items-center gap-2">
                <span>{c.category || "General"}</span>
                <span>•</span>
                <span>Updated {timeAgo(toMillis(c.updatedAt))}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div
                className={`text-[11px] px-2 py-1 rounded-full border ${
                  c.status === "resolved"
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                    : "border-blue-400/25 bg-blue-500/10 text-blue-200"
                }`}
              >
                {c.status}
              </div>

              {unread > 0 && (
                <div className="text-[11px] px-2 py-1 rounded-full bg-red-500 text-white font-semibold">
                  {unread}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
