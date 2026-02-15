'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { createSession } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import FooterLink from "@/components/forms/FooterLink";
import { motion } from "framer-motion";

export default function SignIn() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const token = await credential.user.getIdToken();

      // 🔥 critical fix
      startTransition(async () => {
        await createSession(token);
        router.replace("/stocks");
      });

    } catch (err: any) {
      setError(err.message ?? "Failed to sign in");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-white rounded-2xl p-8 shadow-xl shadow-blue-500/10 will-change-transform"
      >
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Sign in to your StockHorizon account
        </p>

        <form onSubmit={handleSignIn} className="space-y-5">
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
              inputClassName="pr-12"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[42px] text-xs text-blue-600 hover:underline"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
              className="accent-blue-500"
            />
            Remember me
          </label>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 break-words"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30"
          >
            {isPending ? "Signing in…" : "Sign In"}
          </Button>

          <FooterLink
            text="Don't have an account?"
            linkText="Create one"
            href="/sign-up"
          />
        </form>
      </motion.div>
    </motion.div>
  );
}
