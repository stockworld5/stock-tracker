"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { createSession } from "@/lib/actions/auth.actions";

import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  LineChart,
  Lock,
  Globe2,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const features = [
  { icon: LineChart, label: "Signal clarity" },
  { icon: Lock, label: "Protected access" },
  { icon: Globe2, label: "Global-ready" },
];

export default function SignUp() {
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const passwordMatch = password === confirm;
  const passwordReady = password.length >= 6;

  const canSubmit = useMemo(() => {
    return (
      username.trim().length >= 3 &&
      email.trim().length > 0 &&
      passwordReady &&
      passwordMatch &&
      !isPending
    );
  }, [username, email, passwordReady, passwordMatch, isPending]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      await updateProfile(cred.user, { displayName: username.trim() });

      const token = await cred.user.getIdToken();
      await createSession(token);

      router.replace("/stocks");
      router.refresh();
    } catch (err: unknown) {
      const authError =
        typeof err === "object" && err !== null
          ? (err as { code?: string; message?: string })
          : undefined;
      setError(friendlyAuthError(authError?.code || authError?.message));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="relative min-h-[100svh] w-full overflow-x-clip bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.20),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#ecf4ff_100%)] lg:h-[100svh] lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.1]" />

      <motion.div
        aria-hidden="true"
        className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl"
        animate={{ x: [0, 16, 0], y: [0, -12, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-cyan-200/30 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 10, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.09)_1px,transparent_1px)]"
        style={{ backgroundSize: "56px 56px" }}
        animate={{ backgroundPosition: ["0px 0px", "56px 56px"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative mx-auto grid min-h-[100svh] w-full max-w-[1600px] items-center gap-5 px-3 py-3 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1fr)_minmax(460px,560px)] lg:gap-10 lg:px-10 lg:py-6">
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="hidden lg:flex lg:flex-col lg:justify-center"
        >
          <div className="mb-5 flex items-center gap-3">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-semibold tracking-[0.18em] text-blue-700 shadow-sm backdrop-blur"
            >
              StockHorizon
              <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-sky-50/70 px-3 py-1 text-[11px] font-medium text-sky-700">
              <Sparkles className="h-3.5 w-3.5" />
              Professional onboarding
            </span>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200/80 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700 shadow-sm backdrop-blur">
            <ShieldCheck className="h-4 w-4" />
            Secure onboarding
          </div>

          <h1 className="mt-6 max-w-[10ch] text-[clamp(2.6rem,4.8vw,5rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-slate-950">
            Build your trading workspace with a cleaner start.
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-600 xl:text-base">
            StockHorizon gives you a calmer way to track ideas, watch markets,
            and move from signal to decision without dashboard clutter.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/85 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {item.label}
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
          className="mx-auto flex w-full max-w-2xl items-center lg:max-w-none lg:justify-end"
        >
          <div className="w-full lg:max-w-[560px]">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mb-3 flex items-center justify-between rounded-2xl border border-white/85 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur lg:hidden"
            >
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                StockHorizon
              </Link>
              <span className="text-xs font-medium text-slate-600">Create account</span>
            </motion.div>

            <div className="relative w-full overflow-hidden rounded-[28px] border border-white/80 bg-white/80 p-2.5 shadow-[0_20px_70px_rgba(37,99,235,0.10)] backdrop-blur-xl sm:p-3">
              <motion.div
                aria-hidden="true"
                className="absolute inset-x-10 top-0 h-24 rounded-full bg-blue-200/25 blur-3xl"
                animate={{ opacity: [0.25, 0.5, 0.25], y: [0, 8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative rounded-[22px] border border-slate-200/85 bg-white/95 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:px-5 sm:py-5 lg:px-5 lg:py-5">
                <div className="mb-4 lg:mb-3.5">
                  <div className="mb-2.5 flex items-center gap-2 text-blue-700">
                    <ShieldCheck size={16} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                      Secure onboarding
                    </span>
                  </div>

                  <h2 className="text-[clamp(1.9rem,2.7vw,2.75rem)] font-semibold leading-none tracking-tight text-slate-950">
                    Create your account
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Start trading smarter with StockHorizon.
                  </p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InputField
                      name="username"
                      label="Username"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      inputClassName="h-10 rounded-lg"
                    />

                    <InputField
                      name="email"
                      label="Email"
                      placeholder="you@stockhorizon.io"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      inputClassName="h-10 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Country</label>
                    <CountrySelectField value={country} onChange={setCountry} triggerClassName="h-10 rounded-lg" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="relative">
                      <InputField
                        name="password"
                        label="Password"
                        type={showPass ? "text" : "password"}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        inputClassName="h-10 rounded-lg pr-11"
                      />
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-2 top-[2.125rem] inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={showPass ? "Hide password" : "Show password"}
                      >
                        {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                      </motion.button>
                    </div>

                    <div className="relative">
                      <InputField
                        name="confirm"
                        label="Confirm password"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Re-enter password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                        inputClassName="h-10 rounded-lg pr-11"
                      />
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-2 top-[2.125rem] inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                      </motion.button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {!passwordReady && password.length > 0 && (
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="text-xs font-medium text-amber-600"
                      >
                        Password must be at least 6 characters.
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {!passwordMatch && confirm.length > 0 && (
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="text-xs font-medium text-destructive"
                      >
                        Passwords do not match.
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.995 }}
                    transition={{ type: "spring", stiffness: 250, damping: 18 }}
                    className="pt-1"
                  >
                    <Button
                      type="submit"
                      disabled={!canSubmit}
                      className="group relative h-11 w-full overflow-hidden rounded-xl bg-[linear-gradient(130deg,#2563eb,#60a5fa_52%,#7dd3fc)] text-sm font-semibold text-white shadow-[0_12px_28px_rgba(59,130,246,0.28)] hover:opacity-95"
                    >
                      <motion.span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent"
                        animate={{ x: ["0%", "260%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <span className="relative z-10">{isPending ? "Creating account..." : "Create account"}</span>
                    </Button>
                  </motion.div>

                  <FooterLink
                    text="Already have an account?"
                    linkText="Sign in"
                    href="/sign-in"
                  />
                </form>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
