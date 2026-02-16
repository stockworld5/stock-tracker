import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/**
 * Make sure the user has a chat room
 */
export async function ensureChat(userId: string) {
  const chatRef = doc(db, "chats", userId);

  await setDoc(
    chatRef,
    {
      userId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return chatRef;
}

/**
 * Send a message
 */
export async function sendMessage(
  userId: string,
  text: string,
  sender: "user" | "admin"
) {
  const messagesRef = collection(db, "chats", userId, "messages");

  await addDoc(messagesRef, {
    text,
    sender,
    createdAt: serverTimestamp(),
  });
}

/**
 * Listen for messages in realtime
 */
export function listenMessages(
  userId: string,
  callback: (msgs: any[]) => void
) {
  const q = query(
    collection(db, "chats", userId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    callback(messages);
  });
}
