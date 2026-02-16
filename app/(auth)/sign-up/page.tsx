'use client';

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { createSession } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import FooterLink from "@/components/forms/FooterLink";
import { motion, AnimatePresence } from "framer-motion";

function friendlyAuthError(message?: string) {
  const msg = (message ?? "").toLowerCase();
  if (msg.includes("email-already-in-use")) return "That email is already in use.";
  if (msg.includes("invalid-email")) return "That email address looks invalid.";
  if (msg.includes("weak-password")) return "Password is too weak. Try 8+ characters.";
  if (msg.includes("network")) return "Network error. Please try again.";
  return message ?? "Failed to create account.";
}

export default function SignUp() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      email.trim().length > 0 &&
      password.length >= 6 &&
      !isPending
    );
  }, [fullName, email, password, isPending]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // Optional: store displayName in Firebase Auth profile
      if (fullName.trim()) {
        await updateProfile(cred.user, { displayName: fullName.trim() });
      }

      // ✅ Send verification email
      await sendEmailVerification(cred.user);

      const token = await cred.user.getIdToken();

      startTransition(async () => {
        await createSession(token);
        router.replace("/stocks");
      });
    } catch (err: any) {
      setError(friendlyAuthError(err?.code || err?.message));
    }
  }

  return (
    <div className="min-h-[calc(100vh-0px)] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        <div className="rounded-3xl border border-border bg-card p-8 shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
          <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start investing smarter with StockHorizon
          </p>

          <form onSubmit={handleSignUp} className="mt-7 space-y-5">
            <InputField
              name="fullName"
              label="Full Name"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />

            <InputField
              name="email"
              label="Email"
              placeholder="you@stockhorizon.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <InputField
              name="password"
              label="Password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl py-6 text-base shadow-lg shadow-blue-500/20"
            >
              {isPending ? "Creating…" : "Create Account"}
            </Button>

            <FooterLink
              text="Already have an account?"
              linkText="Sign in"
              href="/sign-in"
            />

            <p className="pt-2 text-xs text-muted-foreground">
              We’ll send a verification email after signup.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
