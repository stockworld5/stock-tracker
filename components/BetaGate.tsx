"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BUILD_VERSION = "v0.3.2";
const INVITE_ONLY = false; // toggle invite-only beta

export default function BetaGate() {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [invite, setInvite] = useState("");
  const [validInvite, setValidInvite] = useState(!INVITE_ONLY);

  useEffect(() => {
    const accepted = localStorage.getItem("betaAccepted");
    if (!accepted) setOpen(true);
  }, []);

  const checkInvite = () => {
    if (invite === "STOCKHORIZON") {
      setValidInvite(true);
    }
  };

  const accept = () => {
    if (!agreed || !validInvite) return;
    localStorage.setItem("betaAccepted", "true");
    setOpen(false);
  };

  const legalPoints = [
    "Signals and insights are experimental AI outputs.",
    "Information does not constitute financial or investment advice.",
    "Trading financial markets carries significant risk.",
    "Platform data may contain delays, inaccuracies, or outages during beta.",
    "Use of this platform is entirely at your own risk."
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-xl p-6"
        >

          {/* animated particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(25)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1 rounded-full bg-blue-400/40"
                animate={{
                  y: ["0%", "100%"],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 6 + Math.random() * 4,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                }}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-black/80 backdrop-blur-xl p-10 shadow-[0_0_100px_rgba(59,130,246,0.25)]"
          >

            {/* glow */}
            <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

            {/* badge */}
            <div className="inline-block mb-4 rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
              Early Access Beta
            </div>

            {/* title */}
            <h2 className="text-3xl font-semibold text-white mb-3">
              Beta Program Access
            </h2>

            <p className="text-white/60 mb-6">
              StockHorizon is currently in beta testing. Platform functionality,
              data accuracy, and availability may change.
            </p>

            {/* invite gate */}
            {INVITE_ONLY && !validInvite && (
              <div className="mb-6">
                <input
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  placeholder="Enter beta invite code"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                />

                <button
                  onClick={checkInvite}
                  className="mt-3 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
                >
                  Unlock Access
                </button>
              </div>
            )}

            {/* legal text */}
            <div className="space-y-3 text-sm text-white/70 mb-6">
              {legalPoints.map((text, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.12 }}
                >
                  • {text}
                </motion.p>
              ))}
            </div>

            {/* checkbox */}
            <label className="flex items-center gap-3 text-sm text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={() => setAgreed(!agreed)}
                className="h-4 w-4"
              />
              I acknowledge the risks and agree to the Terms.
            </label>

            {/* buttons */}
            <div className="flex gap-4 mt-8">
              <button
                disabled={!agreed || !validInvite}
                onClick={accept}
                className={`px-6 py-3 rounded-xl font-medium transition
                ${
                  agreed && validInvite
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                }`}
              >
                Enter Platform
              </button>

              <button
                onClick={() => (window.location.href = "https://google.com")}
                className="px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:bg-white/5"
              >
                Leave
              </button>
            </div>

            {/* footer */}
            <div className="flex justify-between items-center mt-6 text-xs text-white/40">
              <span>© {new Date().getFullYear()} StockHorizon</span>
              <span>Build {BUILD_VERSION}</span>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}