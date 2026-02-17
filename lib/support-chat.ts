"use client";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";

/** Types */
export type ChatRole = "user" | "support" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt?: any;
};

export type ConversationStatus = "open" | "resolved";

export type Conversation = {
  id: string;
  createdByUid: string;

  name?: string;
  email?: string;
  category?: string;
  status: ConversationStatus;

  lastMessageText?: string;
  updatedAt?: any;
  createdAt?: any;

  unreadForAdmin?: number;
  unreadForUser?: number;

  // typing timestamps
  typingUserAt?: any;
  typingSupportAt?: any;

  // rating
  rating?: number;
  feedback?: string;

  // optional extras for nicer admin UX (safe to ignore if not used)
  firstIssueText?: string;
  lastUserMessageAt?: any;
  lastSupportMessageAt?: any;
};

export type NewsItem = {
  id: string;
  title: string;
  body: string;
  createdAt?: any;
  updatedAt?: any;
};

export type SupportPresence = {
  online: boolean;
  lastSeen?: any;
  updatedAt?: any;
};

type LocalThread = {
  id: string;
  category?: string;
  email?: string;
  name?: string;
  lastMessageText?: string;
  status?: ConversationStatus;
  updatedAt?: number; // millis for quick sorting
  createdAt?: number;
};

const THREADS_KEY = "support_threads_v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function storageGet(key: string): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

function storageRemove(key: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

/** ---------- Auth helpers ---------- **/

let authReadyPromise: Promise<void> | null = null;

export function ensureAnonAuth(): Promise<void> {
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      unsub();

      if (u) {
        resolve();
        return;
      }

      try {
        await signInAnonymously(auth);
      } catch (e) {
        // If sign-in fails, we still resolve so UI can show error
      } finally {
        resolve();
      }
    });
  });

  return authReadyPromise;
}

/** ---------- Local profile ---------- **/

const LOCAL_KEY = "support_profile_v1";

export function getLocalNameEmail(): { name: string; email: string } {
  try {
    const raw = storageGet(LOCAL_KEY);
    if (!raw) return { name: "", email: "" };
    const parsed = JSON.parse(raw);
    return { name: parsed?.name || "", email: parsed?.email || "" };
  } catch {
    return { name: "", email: "" };
  }
}

export function setLocalNameEmail(name: string, email: string) {
  try {
    storageSet(LOCAL_KEY, JSON.stringify({ name, email }));
  } catch {}
}

/** ---------- Local thread history (since Firestore rules block list for users) ---------- **/

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getLocalThreads(): LocalThread[] {
  const threads = safeParse<LocalThread[]>(storageGet(THREADS_KEY), []);
  // clean + sort
  return (threads || [])
    .filter((t) => !!t?.id)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 25);
}

export function upsertLocalThread(patch: Partial<LocalThread> & { id: string }) {
  try {
    const cur = getLocalThreads();
    const idx = cur.findIndex((t) => t.id === patch.id);
    const next: LocalThread = {
      ...(idx >= 0 ? cur[idx] : { id: patch.id }),
      ...patch,
    };

    const out = idx >= 0 ? [...cur.slice(0, idx), next, ...cur.slice(idx + 1)] : [next, ...cur];
    storageSet(THREADS_KEY, JSON.stringify(out.slice(0, 25)));
  } catch {}
}

export function removeLocalThread(id: string) {
  try {
    const cur = getLocalThreads().filter((t) => t.id !== id);
    storageSet(THREADS_KEY, JSON.stringify(cur));
  } catch {}
}

/** ---------- Conversation ---------- **/

export async function ensureConversation(): Promise<string> {
  await ensureAnonAuth();

  const u = auth.currentUser;
  if (!u) throw new Error("Anonymous auth not available.");

  // re-use existing conv id in localStorage
  const existing = storageGet("support_conv_id_v1");
  if (existing) {
    try {
      // make sure doc exists AND belongs to this user
      const snap = await getDoc(doc(db, "conversations", existing));
      if (snap.exists() && snap.data()?.createdByUid === u.uid) {
        // keep in threads list
        upsertLocalThread({
          id: existing,
          status: (snap.data() as any)?.status ?? "open",
          category: (snap.data() as any)?.category ?? "General",
          email: (snap.data() as any)?.email ?? "",
          name: (snap.data() as any)?.name ?? "",
          lastMessageText: (snap.data() as any)?.lastMessageText ?? "",
          updatedAt: Date.now(),
        });
        return existing;
      }
    } catch {
      // stale/forbidden id; fall through and create a fresh conversation
    }
    storageRemove("support_conv_id_v1");
  }

  // Create new conversation with createdByUid
  const ref = await addDoc(collection(db, "conversations"), {
    createdByUid: u.uid,
    status: "open",
    category: "General",
    name: "",
    email: "",
    lastMessageText: "",
    unreadForAdmin: 0,
    unreadForUser: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  storageSet("support_conv_id_v1", ref.id);
  upsertLocalThread({
    id: ref.id,
    category: "General",
    status: "open",
    updatedAt: Date.now(),
    createdAt: Date.now(),
  });

  return ref.id;
}

export async function startNewConversation(seed?: Partial<Pick<Conversation, "category" | "name" | "email">>): Promise<string> {
  await ensureAnonAuth();
  const u = auth.currentUser;
  if (!u) throw new Error("Anonymous auth not available.");

  const ref = await addDoc(collection(db, "conversations"), {
    createdByUid: u.uid,
    status: "open",
    category: seed?.category ?? "General",
    name: seed?.name ?? "",
    email: seed?.email ?? "",
    lastMessageText: "",
    unreadForAdmin: 0,
    unreadForUser: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  storageSet("support_conv_id_v1", ref.id);
  upsertLocalThread({
    id: ref.id,
    category: seed?.category ?? "General",
    status: "open",
    name: seed?.name ?? "",
    email: seed?.email ?? "",
    updatedAt: Date.now(),
    createdAt: Date.now(),
  });

  return ref.id;
}

export async function setConversationDetails(
  convId: string,
  details: Partial<Pick<Conversation, "name" | "email" | "category">>
) {
  await ensureAnonAuth();
  const patch: any = { ...details, updatedAt: serverTimestamp() };
  await updateDoc(doc(db, "conversations", convId), patch);

  // also save locally for UX
  const local = getLocalNameEmail();
  setLocalNameEmail(details.name ?? local.name, details.email ?? local.email);

  // thread cache
  upsertLocalThread({
    id: convId,
    name: details.name ?? local.name,
    email: details.email ?? local.email,
    category: details.category,
    updatedAt: Date.now(),
  });
}

export async function setConversationCategory(convId: string, category: string) {
  await ensureAnonAuth();
  await updateDoc(doc(db, "conversations", convId), { category, updatedAt: serverTimestamp() });
  upsertLocalThread({ id: convId, category, updatedAt: Date.now() });
}

export function listenConversation(
  convId: string,
  cb: (c: Conversation | null) => void,
  onError?: (error: unknown) => void
) {
  return onSnapshot(
    doc(db, "conversations", convId),
    (snap) => {
      if (!snap.exists()) return cb(null);
      const data = { id: snap.id, ...(snap.data() as any) } as Conversation;

      // keep local thread updated
      upsertLocalThread({
        id: data.id,
        category: data.category,
        email: data.email,
        name: data.name,
        lastMessageText: data.lastMessageText,
        status: data.status,
        updatedAt: Date.now(),
      });

      cb(data);
    },
    (error) => {
      cb(null);
      onError?.(error);
    }
  );
}

export function listenSupportMessages(
  convId: string,
  cb: (m: ChatMessage[]) => void,
  onError?: (error: unknown) => void
) {
  const qy = query(
    collection(db, "conversations", convId, "messages"),
    orderBy("createdAt", "asc"),
    limit(400)
  );

  return onSnapshot(
    qy,
    (snap) => {
      const out: ChatMessage[] = [];
      snap.forEach((d) => out.push({ id: d.id, ...(d.data() as any) }));
      cb(out);
    },
    (error) => {
      cb([]);
      onError?.(error);
    }
  );
}

export async function sendSupportMessage(convId: string, role: ChatRole, text: string) {
  await ensureAnonAuth();
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");

  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, "conversations", convId, "messages"), {
    role,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  // update conversation preview/unreads
  const patch: any = {
    lastMessageText: trimmed,
    updatedAt: serverTimestamp(),
  };

  // store extra timestamps for nicer admin view / routing
  if (role === "user") patch.lastUserMessageAt = serverTimestamp();
  if (role === "support") patch.lastSupportMessageAt = serverTimestamp();

  // set first issue only once (helps admin triage)
  if (role === "user") {
    try {
      const snap = await getDoc(doc(db, "conversations", convId));
      if (snap.exists()) {
        const d: any = snap.data();
        if (!d?.firstIssueText) patch.firstIssueText = trimmed;
      }
    } catch {}
  }

  if (role === "user") {
    patch.unreadForAdmin = (await getUnread(convId, "admin")) + 1;
  } else if (role === "support") {
    patch.unreadForUser = (await getUnread(convId, "user")) + 1;
  }

  await updateDoc(doc(db, "conversations", convId), patch);

  // local thread cache
  upsertLocalThread({
    id: convId,
    lastMessageText: trimmed,
    updatedAt: Date.now(),
  });
}

async function getUnread(convId: string, who: "admin" | "user"): Promise<number> {
  try {
    const snap = await getDoc(doc(db, "conversations", convId));
    if (!snap.exists()) return 0;
    const d: any = snap.data();
    return Math.max(0, Number(who === "admin" ? d.unreadForAdmin : d.unreadForUser) || 0);
  } catch {
    return 0;
  }
}

export async function markConversationRead(convId: string, who: "admin" | "user" | "support") {
  await ensureAnonAuth();
  const patch: any = { updatedAt: serverTimestamp() };

  // treat "support" the same as admin in your UI
  if (who === "admin" || who === "support") patch.unreadForAdmin = 0;
  if (who === "user") patch.unreadForUser = 0;

  await updateDoc(doc(db, "conversations", convId), patch);
}

export async function resolveConversation(convId: string) {
  await ensureAnonAuth();
  await updateDoc(doc(db, "conversations", convId), { status: "resolved", updatedAt: serverTimestamp() });
  await addDoc(collection(db, "conversations", convId, "messages"), {
    role: "system",
    text: "Resolved",
    createdAt: serverTimestamp(),
  });

  upsertLocalThread({ id: convId, status: "resolved", updatedAt: Date.now() });
}

export async function reopenConversation(convId: string) {
  await ensureAnonAuth();
  await updateDoc(doc(db, "conversations", convId), { status: "open", updatedAt: serverTimestamp() });
  await addDoc(collection(db, "conversations", convId, "messages"), {
    role: "system",
    text: "Reopened",
    createdAt: serverTimestamp(),
  });

  upsertLocalThread({ id: convId, status: "open", updatedAt: Date.now() });
}

/** ---------- Admin inbox ---------- **/

export function listenConversations(
  cb: (c: Conversation[]) => void,
  onError?: (error: unknown) => void
) {
  const qy = query(collection(db, "conversations"), orderBy("updatedAt", "desc"), limit(200));
  return onSnapshot(
    qy,
    (snap) => {
      const out: Conversation[] = [];
      snap.forEach((d) => out.push({ id: d.id, ...(d.data() as any) }));
      cb(out);
    },
    (error) => {
      cb([]);
      onError?.(error);
    }
  );
}

/** ---------- Typing ---------- **/

export async function setTyping(convId: string, who: "user" | "support", isTyping: boolean) {
  await ensureAnonAuth();
  const key = who === "user" ? "typingUserAt" : "typingSupportAt";
  await updateDoc(doc(db, "conversations", convId), {
    [key]: isTyping ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  } as any);
}

/** ---------- Presence ---------- **/

export async function setSupportPresence(online: boolean) {
  await ensureAnonAuth();
  await setDoc(
    doc(db, "presence", "support"),
    {
      online,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function listenSupportPresence(
  cb: (presence: SupportPresence) => void,
  onError?: (error: unknown) => void
) {
  return onSnapshot(
    doc(db, "presence", "support"),
    (snap) => {
      const data = snap.data() as any;
      cb({
        online: !!data?.online,
        lastSeen: data?.updatedAt ?? null,
        updatedAt: data?.updatedAt ?? null,
      });
    },
    (error) => {
      cb({ online: false, lastSeen: null, updatedAt: null });
      onError?.(error);
    }
  );
}

/** ---------- News ---------- **/

export function listenNews(cb: (items: NewsItem[]) => void, onError?: (error: unknown) => void) {
  const qy = query(collection(db, "news"), orderBy("createdAt", "desc"), limit(10));
  return onSnapshot(
    qy,
    (snap) => {
      const out: NewsItem[] = [];
      snap.forEach((d) => out.push({ id: d.id, ...(d.data() as any) }));
      cb(out);
    },
    (error) => {
      cb([]);
      onError?.(error);
    }
  );
}

export async function postNews(title: string, body: string) {
  await ensureAnonAuth();
  const t = title.trim();
  const b = body.trim();
  if (!t || !b) return;

  await addDoc(collection(db, "news"), {
    title: t,
    body: b,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateNews(id: string, title: string, body: string) {
  await ensureAnonAuth();
  await updateDoc(doc(db, "news", id), {
    title: title.trim(),
    body: body.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteNews(id: string) {
  await ensureAnonAuth();
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "news", id));
}

export async function submitConversationRating(
  convId: string,
  rating: number,
  feedback?: string
) {
  await ensureAnonAuth();
  const cleanFeedback = (feedback ?? "").trim();

  await updateDoc(doc(db, "conversations", convId), {
    rating,
    feedback: cleanFeedback,
    updatedAt: serverTimestamp(),
  } as any);

  await addDoc(collection(db, "conversations", convId, "messages"), {
    role: "system",
    text: cleanFeedback ? `Rating: ${rating}/5. Feedback: ${cleanFeedback}` : `Rating: ${rating}/5`,
    createdAt: serverTimestamp(),
  });
}
