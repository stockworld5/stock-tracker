"use client";

import { sendEmailVerification, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useEffect, useState } from "react";

export default function EmailVerificationBanner() {
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setShow(!!user && !user.emailVerified);
    });
  }, []);

  if (!show || !auth.currentUser) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-900 px-4 py-3 text-sm flex justify-between">
      <span>Please verify your email address.</span>

      <button
        onClick={async () => {
          await sendEmailVerification(auth.currentUser!);
          setSent(true);
          setTimeout(() => setSent(false), 2500);
        }}
        className="underline font-medium"
      >
        {sent ? "Sent!" : "Resend"}
      </button>
    </div>
  );
}
