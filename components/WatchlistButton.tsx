"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
} from "@/lib/watchlist";

export default function WatchlistButton({ symbol }: { symbol: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ---------------- AUTH + INITIAL STATE ---------------- */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);

      if (!u) {
        setLoading(false);
        return;
      }

      try {
        const exists = await isInWatchlist(u.uid, symbol);
        setActive(exists);
      } catch {
        setActive(false);
      }

      setLoading(false);
    });

    return () => unsub();
  }, [symbol]);

  /* ---------------- TOGGLE ---------------- */

  async function toggle() {
    if (!user || saving) return;

    setSaving(true);

    const previous = active;
    const next = !previous;

    // optimistic UI
    setActive(next);

    try {
      if (next) {
        await addToWatchlist(user.uid, symbol);
      } else {
        await removeFromWatchlist(user.uid, symbol);
      }
    } catch (e) {
      // rollback on failure
      setActive(previous);
    } finally {
      setSaving(false);
    }
  }

  if (!user || loading) return null;

  /* ---------------- UI ---------------- */

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      disabled={saving}
      className={`p-2 rounded-lg border transition ${
        active
          ? "bg-yellow-400 text-black border-yellow-400"
          : "bg-white text-slate-500 hover:text-yellow-500"
      } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
      title={active ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Star size={18} fill={active ? "currentColor" : "none"} />
    </motion.button>
  );
}
