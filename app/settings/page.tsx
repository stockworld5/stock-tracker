"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut } from "lucide-react";

import SettingsForm from "./settings-form";

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      // not logged in
      if (!u) {
        router.replace("/sign-in");
        return;
      }

      // 🔥 WAIT FOR FIREBASE TO FULLY LOAD USER
      await u.reload();

      // sometimes email still null for a tick → wait until available
      if (!u.email) {
        setTimeout(() => {
          setUser({ ...auth.currentUser! });
          setLoading(false);
        }, 150);
      } else {
        setUser(u);
        setLoading(false);
      }

      // fetch profile AFTER auth ready
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) setProfile(snap.data());
    });

    return () => unsub();
  }, [router]);

  async function handleSave(data: any) {
    if (!auth.currentUser) return;

    await updateProfile(auth.currentUser, {
      displayName: data.username,
    });

    await setDoc(
      doc(db, "users", auth.currentUser.uid),
      {
        ...data,
        email: auth.currentUser.email ?? "",
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/sign-in");
  }

  if (loading || !user) {
    return <div className="p-10 text-muted-foreground">Loading…</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto px-6 py-10 space-y-8"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/stocks")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to Stocks
        </button>
      </div>

      <h1 className="text-2xl font-semibold">Settings</h1>

      <SettingsForm user={user} profile={profile} onSave={handleSave} />

      <div className="flex justify-end pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-destructive text-sm"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </motion.div>
  );
}
