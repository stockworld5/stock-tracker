import { db } from "@/lib/firebase/client";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
} from "firebase/firestore";

/**
 * Firestore structure:
 *
 * watchlists/{uid}/stocks/{symbol}
 */

function stockRef(uid: string, symbol: string) {
  return doc(db, "watchlists", uid, "stocks", symbol);
}

function stocksCollection(uid: string) {
  return collection(db, "watchlists", uid, "stocks");
}

/* ---------------- GET LIST ---------------- */

export async function getWatchlist(uid: string): Promise<string[]> {
  const snap = await getDocs(stocksCollection(uid));
  return snap.docs.map((d) => d.id);
}

/* ---------------- ADD ---------------- */

export async function addToWatchlist(uid: string, symbol: string) {
  await setDoc(stockRef(uid, symbol), {
    addedAt: Date.now(),
  });
}

/* ---------------- REMOVE ---------------- */

export async function removeFromWatchlist(uid: string, symbol: string) {
  await deleteDoc(stockRef(uid, symbol));
}

/* ---------------- CHECK ---------------- */

export async function isInWatchlist(
  uid: string,
  symbol: string
): Promise<boolean> {
  const snap = await getDoc(stockRef(uid, symbol));
  return snap.exists();
}
