"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { createSession } from "@/lib/actions/auth.actions";

import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import FooterLink from "@/components/forms/FooterLink";
import CountrySelectField from "@/components/forms/CountrySelectField";

function friendlyAuthError(message?: string) {
  const msg = (message ?? "").toLowerCase();
  if (msg.includes("email-already-in-use")) return "That email is already registered.";
  if (msg.includes("invalid-email")) return "Enter a valid email address.";
  if (msg.includes("weak-password")) return "Password must be at least 6 characters.";
  if (msg.includes("network")) return "Network error. Please try again.";
  return message ?? "Failed to create account.";
}

export default function SignUp() {
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const passwordMatch = password === confirm;

  const canSubmit = useMemo(() => {
    return (
      username.trim().length >= 3 &&
      email.trim().length > 0 &&
      password.length >= 6 &&
      passwordMatch &&
      !isPending
    );
  }, [username, email, password, passwordMatch, isPending]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // username -> firebase displayName
      await updateProfile(cred.user, { displayName: username.trim() });

      // send verification
      await sendEmailVerification(cred.user);

      // create session
      const token = await cred.user.getIdToken();
      await createSession(token);

      router.replace("/stocks");
      router.refresh();
    } catch (err: any) {
      setError(friendlyAuthError(err?.code || err?.message));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-background to-muted/30">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        <div className="rounded-3xl border border-border bg-card/80 backdrop-blur p-8 shadow-[0_20px_70px_rgba(0,0,0,0.25)]">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-primary mb-2">
              <ShieldCheck size={18}/>
              <span className="text-xs uppercase tracking-widest">Secure onboarding</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Start trading smarter with StockHorizon
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">

            {/* USERNAME */}
            <InputField
              name="username"
              label="Username"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />

            {/* EMAIL */}
            <InputField
              name="email"
              label="Email"
              placeholder="you@stockhorizon.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            {/* COUNTRY */}
            <div>
              <label className="text-sm text-muted-foreground">Country</label>
              <CountrySelectField value={country} onChange={setCountry} />
            </div>

            {/* PHONE OPTIONAL */}
            <InputField
              name="phone"
              label="Phone (optional)"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {/* PASSWORD */}
            <div className="relative">
              <InputField
                name="password"
                label="Password"
                type={showPass ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
              >
                {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="relative">
              <InputField
                name="confirm"
                label="Confirm password"
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            {!passwordMatch && confirm.length > 0 && (
              <p className="text-xs text-destructive">
                Passwords do not match
              </p>
            )}

            {/* ERROR */}
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

            {/* SUBMIT */}
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl py-6 text-base shadow-lg shadow-blue-500/20"
            >
              {isPending ? "Creating account…" : "Create Account"}
            </Button>

            <FooterLink
              text="Already have an account?"
              linkText="Sign in"
              href="/sign-in"
            />

            <p className="pt-2 text-xs text-muted-foreground text-center">
              We’ll send a verification email after signup.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
