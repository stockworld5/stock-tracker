// lib/support-chat.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  limit,
  Unsubscribe,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";

export type ChatRole = "user" | "support" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt?: Timestamp | any;
};

export type ConversationStatus = "open" | "resolved";

export type Conversation = {
  id: string;
  name?: string;
  email?: string;
  category?: string;
  status?: ConversationStatus;

  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;

  lastMessageAt?: Timestamp | any;
  lastMessageText?: string;

  readAtUser?: Timestamp | any;
  readAtSupport?: Timestamp | any;

  typingUserAt?: Timestamp | any | null;
  typingSupportAt?: Timestamp | any | null;

  // NEW: used to know when it was resolved
  resolvedAt?: Timestamp | any | null;

  rating?: number;
  feedback?: string;
  ratedAt?: Timestamp | any;
  ratingSubmittedAt?: Timestamp | any;
};

export type SupportPresence = {
  online?: boolean;
  lastSeen?: Timestamp | any;
};

const LS_KEY = "support_chat_identity_v1";
const LS_CONV = "support_chat_conv_id_v1";

export function getLocalNameEmail(): { name: string; email: string } {
  if (typeof window === "undefined") return { name: "", email: "" };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { name: "", email: "" };
    const parsed = JSON.parse(raw);
    return { name: parsed?.name || "", email: parsed?.email || "" };
  } catch {
    return { name: "", email: "" };
  }
}

function setLocalNameEmail(next: { name?: string; email?: string }) {
  if (typeof window === "undefined") return;
  const cur = getLocalNameEmail();
  localStorage.setItem(LS_KEY, JSON.stringify({ ...cur, ...next }));
}

function getLocalConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_CONV);
}

function setLocalConversationId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_CONV, id);
}

export function clearLocalConversation() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_CONV);
}

async function waitForAuthUser(timeoutMs = 6000): Promise<User | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    let done = false;

    const t = setTimeout(() => {
      if (done) return;
      done = true;
      unsub();
      resolve(auth.currentUser ?? null);
    }, timeoutMs);

    const unsub = onAuthStateChanged(auth, (u) => {
      if (done) return;
      if (u) {
        done = true;
        clearTimeout(t);
        unsub();
        resolve(u);
      }
    });
  });
}

export async function ensureAnonAuth(): Promise<User> {
  if (!auth) throw new Error("Firebase auth not initialized");
  if (auth.currentUser) return auth.currentUser;

  const restored = await waitForAuthUser(1200);
  if (restored) return restored;

  const cred = await signInAnonymously(auth);
  return cred.user;
}

/** -----------------------------
 * Conversations
 * ------------------------------ */
export async function ensureConversation(): Promise<string> {
  await ensureAnonAuth();

  const existing = getLocalConversationId();
  if (existing) {
    const ref = doc(db, "conversations", existing);
    const snap = await getDoc(ref);
    if (snap.exists()) return existing;
  }

  const ref = doc(collection(db, "conversations"));
  const { name, email } = getLocalNameEmail();

  await setDoc(ref, {
    name: name || "",
    email: email || "",
    category: "General",
    status: "open",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessageText: "",
    readAtUser: serverTimestamp(),
    typingUserAt: null,
    typingSupportAt: null,
    resolvedAt: null,
    rating: null,
    feedback: "",
    ratingSubmittedAt: null,
  });

  setLocalConversationId(ref.id);
  return ref.id;
}

export async function startNewConversation(): Promise<string> {
  clearLocalConversation();
  return ensureConversation();
}

export async function setConversationDetails(
  convId: string,
  details: Partial<Pick<Conversation, "name" | "email" | "category">>
) {
  await ensureAnonAuth();
  const ref = doc(db, "conversations", convId);
  await updateDoc(ref, { ...details, updatedAt: serverTimestamp() });

  if (details.name !== undefined) setLocalNameEmail({ name: details.name });
  if (details.email !== undefined) setLocalNameEmail({ email: details.email });
}

export function listenConversation(
  convId: string,
  cb: (c: Conversation | null) => void
): Unsubscribe {
  const ref = doc(db, "conversations", convId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return cb(null);
    cb({ id: snap.id, ...(snap.data() as any) });
  });
}

/** -----------------------------
 * Typing
 * ------------------------------ */
export async function setTyping(convId: string, who: "user" | "support", isTyping: boolean) {
  await ensureAnonAuth();
  const ref = doc(db, "conversations", convId);
  const field = who === "user" ? "typingUserAt" : "typingSupportAt";
  await updateDoc(ref, {
    [field]: isTyping ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  } as any);
}

/** -----------------------------
 * Messages
 * ------------------------------ */
export function listenSupportMessages(convId: string, cb: (messages: ChatMessage[]) => void): Unsubscribe {
  const msgsRef = collection(db, "conversations", convId, "messages");
  const q = query(msgsRef, orderBy("createdAt", "asc"), limit(500));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }))
    );
  });
}

export async function sendSupportMessage(convId: string, role: ChatRole, text: string) {
  await ensureAnonAuth();

  const trimmed = (text || "").trim();
  if (!trimmed) return;

  await addDoc(collection(db, "conversations", convId, "messages"), {
    role,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "conversations", convId), {
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessageText: trimmed.slice(0, 500),
    status: "open",
    resolvedAt: null,
    ...(role === "user"
      ? { readAtUser: serverTimestamp(), typingUserAt: null }
      : { readAtSupport: serverTimestamp(), typingSupportAt: null }),
  });
}

/** -----------------------------
 * Read receipts
 * ------------------------------ */
export async function markConversationRead(convId: string, who: "user" | "support") {
  await ensureAnonAuth();
  await updateDoc(doc(db, "conversations", convId), {
    updatedAt: serverTimestamp(),
    ...(who === "user" ? { readAtUser: serverTimestamp() } : { readAtSupport: serverTimestamp() }),
  });
}

/** -----------------------------
 * Rating
 * ------------------------------ */
export async function submitConversationRating(convId: string, rating: number, feedback?: string) {
  await ensureAnonAuth();
  await updateDoc(doc(db, "conversations", convId), {
    rating,
    feedback: (feedback || "").trim(),
    ratedAt: serverTimestamp(),
    ratingSubmittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** -----------------------------
 * Admin helpers
 * ------------------------------ */
export function listenConversations(
  cb: (conversations: Conversation[]) => void,
  opts?: { status?: ConversationStatus; max?: number }
): Unsubscribe {
  const convsRef = collection(db, "conversations");
  const parts: any[] = [];
  if (opts?.status) parts.push(where("status", "==", opts.status));
  parts.push(orderBy("lastMessageAt", "desc"));
  if (opts?.max) parts.push(limit(opts.max));

  return onSnapshot(query(convsRef, ...parts), (snap) => {
    cb(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }))
    );
  });
}

export async function setConversationCategory(convId: string, category: string) {
  await ensureAnonAuth();
  await updateDoc(doc(db, "conversations", convId), { category, updatedAt: serverTimestamp() });
}

export async function resolveConversation(convId: string) {
  await ensureAnonAuth();

  await updateDoc(doc(db, "conversations", convId), {
    status: "resolved",
    resolvedAt: serverTimestamp(),
    typingUserAt: null,
    typingSupportAt: null,
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, "conversations", convId, "messages"), {
    role: "system",
    text: "Resolved",
    createdAt: serverTimestamp(),
  });
}

export async function reopenConversation(convId: string) {
  await ensureAnonAuth();
  await updateDoc(doc(db, "conversations", convId), {
    status: "open",
    resolvedAt: null,
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, "conversations", convId, "messages"), {
    role: "system",
    text: "Reopened",
    createdAt: serverTimestamp(),
  });
}

/** -----------------------------
 * Presence
 * ------------------------------ */
export function listenSupportPresence(cb: (p: SupportPresence | null) => void): Unsubscribe {
  const ref = doc(db, "presence", "support");
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return cb(null);
    cb(snap.data() as any);
  });
}

export async function setSupportPresence(online: boolean) {
  await ensureAnonAuth();
  const ref = doc(db, "presence", "support");
  await setDoc(ref, { online, lastSeen: serverTimestamp() }, { merge: true });
}
