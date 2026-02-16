'use client';

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { createSession } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import FooterLink from "@/components/forms/FooterLink";
import { motion, AnimatePresence } from "framer-motion";

function friendlyAuthError(message?: string) {
  const msg = (message ?? "").toLowerCase();
  if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found"))
    return "Incorrect email or password.";
  if (msg.includes("too-many-requests"))
    return "Too many attempts. Please wait a moment.";
  return "Unable to sign in.";
}

export default function SignIn() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent">("idle");

  const canSubmit = useMemo(() => {
    return email.trim() && password.length > 0 && !isPending;
  }, [email, password, isPending]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await cred.user.getIdToken();

      startTransition(async () => {
        await createSession(token);
        router.replace("/stocks");
      });
    } catch (err: any) {
      setError(friendlyAuthError(err?.code || err?.message));
    }
  }

  async function handleReset() {
    setResetStatus("sending");
    await sendPasswordResetEmail(auth, resetEmail.trim());
    setResetStatus("sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl">

        <div className="grid md:grid-cols-2 rounded-[32px] overflow-hidden border border-border shadow-[0_25px_80px_rgba(0,0,0,0.25)]">

          {/* LEFT PANEL */}
          <div className="relative hidden md:flex flex-col justify-between p-14 text-white overflow-hidden">

            <div className="absolute inset-0 bg-[#0b0f14]" />
            <div className="absolute inset-0 bg-hero-grid opacity-40" />
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-500/20 blur-[160px]" />
            <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-cyan-400/20 blur-[180px]" />
            <div className="absolute inset-0 bg-scanlines opacity-20" />

            <div className="relative z-10">

              {/* CLICKABLE LOGO */}
              <Link
                href="/"
                className="text-xs tracking-widest text-white/60 mb-8 block hover:text-white transition"
              >
                STOCKHORIZON
              </Link>

              <h2 className="text-5xl font-semibold leading-tight tracking-tight">
                Track.<br/>Analyze.<br/>Invest smarter.
              </h2>

              <p className="mt-6 text-white/70 max-w-sm text-lg leading-relaxed">
                Real-time insights, alerts and portfolio intelligence in one trading workspace.
              </p>
            </div>

            <div className="relative z-10 text-xs text-white/40">Privacy • Terms • Help</div>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex items-center justify-center bg-card/80 backdrop-blur-xl p-14">
            <div className="w-full max-w-md">

              <div className="mb-12">
                <h1 className="text-4xl font-semibold tracking-tight">Welcome back!</h1>
                <p className="text-muted-foreground mt-3 text-base">Sign into your account</p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-6">

                <InputField
                  name="email"
                  label="Email"
                  placeholder="you@stockhorizon.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <div className="relative">
                  <InputField
                    name="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    inputClassName="pr-28"
                  />

                  <div className="absolute right-0 top-[38px] flex items-center gap-4 text-sm">
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="text-primary hover:underline">
                      {showPassword ? "Hide" : "Show"}
                    </button>

                    <button type="button" onClick={() => {setResetOpen(true); setResetEmail(email)}} className="text-muted-foreground hover:text-foreground">
                      Forgot?
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                  <input type="checkbox" checked={remember} onChange={() => setRemember(v => !v)} className="accent-[color:var(--primary)]"/>
                  Remember me
                </label>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500">
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button type="submit" disabled={!canSubmit} className="w-full h-12 text-base rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_8px_24px_rgba(37,99,235,0.25)]">
                  {isPending ? "Signing in…" : "Log in"}
                </Button>

                <FooterLink text="Don't have an account?" linkText="Sign up" href="/sign-up" />

                <p className="text-xs text-muted-foreground text-center pt-4">
                  By continuing you agree to our Terms & Privacy Policy.
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* RESET MODAL */}
        <AnimatePresence>
          {resetOpen && (
            <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <motion.div className="bg-card rounded-2xl p-6 w-[380px] border border-border">
                <h3 className="font-semibold text-lg mb-2">Reset password</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter your email to receive a reset link.
                </p>

                <InputField name="resetEmail" label="Email" value={resetEmail} onChange={(e)=>setResetEmail(e.target.value)} />

                <Button onClick={handleReset} className="w-full mt-4">
                  {resetStatus === "sending" ? "Sending…" : resetStatus === "sent" ? "Sent!" : "Send reset link"}
                </Button>

                <button className="text-sm text-muted-foreground mt-3 w-full" onClick={()=>setResetOpen(false)}>
                  Back
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
