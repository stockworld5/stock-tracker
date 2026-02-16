"use client";

import { motion } from "framer-motion";
import { BrainCircuit, LineChart, ShieldCheck, Target, Zap } from "lucide-react";

const CARDS = [
  {
    title: "Live Market Signals",
    desc: "Actionable alerts from real-time price + volatility conditions.",
    icon: Zap,
    kicker: "Realtime",
  },
  {
    title: "AI Trade Insights",
    desc: "Models rank setups by probability and context — not hype.",
    icon: BrainCircuit,
    kicker: "AI-ranked",
  },
  {
    title: "Risk Management",
    desc: "Structured entries, exits, stops, and position sizing guidance.",
    icon: ShieldCheck,
    kicker: "Disciplined",
  },
];

function Sparkline() {
  return (
    <svg
      aria-hidden
      className="absolute right-6 top-6 h-10 w-28 opacity-[0.22]"
      viewBox="0 0 120 40"
      preserveAspectRatio="none"
    >
      <path
        d="M0,26 C10,22 18,30 28,26 C38,22 40,10 52,12 C64,14 68,30 80,26 C92,22 98,8 110,10 C114,10 117,12 120,14"
        fill="none"
        stroke="rgba(37,99,235,0.9)"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function Services() {
  return (
    <section className="relative bg-white py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            Our Services
          </p>

          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-gray-900">
            A trading edge that feels professional.
          </h2>

          <p className="mt-4 max-w-2xl text-gray-600">
            Built for speed and clarity — signals, insights, and risk controls
            that look and behave like a serious platform.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }}
              className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_10px_30px_rgba(37,99,235,0.08)]"
            >
              {/* animated shine */}
              <div className="pointer-events-none absolute -inset-24 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500/10 via-blue-400/5 to-transparent blur-2xl" />
              </div>

              <Sparkline />

              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 ring-1 ring-blue-100">
                    <c.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-widest text-blue-600">
                      {c.kicker}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">
                      {c.title}
                    </h3>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                  <LineChart className="h-3.5 w-3.5" />
                  Signal Quality
                </div>
              </div>

              <p className="relative z-10 mt-5 text-gray-600">{c.desc}</p>

              {/* micro “terminal” footer */}
              <div className="relative z-10 mt-7 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="inline-flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-blue-600" />
                    Setup Confidence
                  </span>
                  <span className="font-semibold text-gray-900">
                    {(86 - i * 7).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-600/80"
                    style={{ width: `${86 - i * 7}%` }}
                  />
                </div>
              </div>

              <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-transparent transition group-hover:ring-blue-200/60" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
