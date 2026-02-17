"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UserAvatar({ className }: { className?: string }) {
  const [letter, setLetter] = useState("?");
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        setLetter("?");
        setPhoto(null);
        return;
      }

      // 1️⃣ Photo (highest priority)
      if (user.photoURL) setPhoto(user.photoURL);

      // 2️⃣ Try Firestore username
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const username = snap.data()?.username;

        if (username && username.length > 0) {
          setLetter(username[0].toUpperCase());
          return;
        }
      } catch {}

      // 3️⃣ fallback → displayName
      if (user.displayName) {
        setLetter(user.displayName[0].toUpperCase());
        return;
      }

      // 4️⃣ fallback → email
      if (user.email) {
        setLetter(user.email[0].toUpperCase());
        return;
      }

      setLetter("?");
    });

    return () => unsub();
  }, []);

  return (
    <Avatar className={`bg-muted ${className ?? ""}`}>
      {photo && <AvatarImage src={photo} alt="avatar" />}
      <AvatarFallback className="font-semibold">
        {letter}
      </AvatarFallback>
    </Avatar>
  );
}
