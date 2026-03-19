"use client";

import { SiFirebase, SiGoogle, SiGithub, SiVercel } from "react-icons/si";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Activity, Timer } from "lucide-react";

function useCountUp(target: number, ms = 900) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return val;
}

function DataStream() {
  // subtle moving “market bus” line
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-1/2 top-1/2 h-px w-[200%] bg-gradient-to-r from-transparent via-white/30 to-transparent animate-datastream" />
      <div className="absolute left-0 top-0 h-full w-full bg-scanlines opacity-[0.18]" />
      <div className="absolute inset-0 bg-noise opacity-[0.10]" />
    </div>
  );
}

export default function TrustedTech() {
  const uptime = useCountUp(99.98, 1100);
  const latency = useCountUp(12.4, 900);
  const events = useCountUp(3.2, 1000);

  const logos = useMemo(
    () => [
      { Icon: SiFirebase, name: "Firebase" },
      { Icon: SiGoogle, name: "Google Cloud" },
      { Icon: SiGithub, name: "GitHub" },
      { Icon: SiVercel, name: "Vercel" },
    ],
    []
  );

  return (
    <section className="relative border-t bg-white py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white shadow-[0_30px_90px_rgba(2,6,23,0.35)]">
          {/* ambient */}
          <div className="absolute inset-0 bg-hero-grid opacity-[0.22]" />
          <DataStream />

          {/* soft glow blobs */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 top-10 h-80 w-80 rounded-full bg-indigo-400/15 blur-3xl" />

          <div className="relative z-10 grid gap-10 p-10 md:grid-cols-2 md:p-14">
            {/* left */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs tracking-[0.32em] text-white/55">
                TRUSTED TECHNOLOGY USED
              </p>

              <h3 className="mt-4 text-3xl font-bold tracking-tight">
                Built like infrastructure,
                <span className="text-blue-200"> not a toy.</span>
              </h3>

              <p className="mt-4 max-w-lg text-white/75">
                Your edge depends on reliability. StockHorizon runs on modern,
                secure, and scalable systems designed for speed, uptime, and
                continuous delivery.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-xs text-white/65">
                    <ShieldCheck className="h-4 w-4" />
                    Uptime
                  </div>
                  <div className="mt-2 text-xl font-semibold">
                    {uptime.toFixed(2)}%
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    Trailing 30 days
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-xs text-white/65">
                    <Timer className="h-4 w-4" />
                    P95 Latency
                  </div>
                  <div className="mt-2 text-xl font-semibold">
                    {latency.toFixed(1)}ms
                  </div>
                  <div className="mt-1 text-xs text-white/45">API edge</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-xs text-white/65">
                    <Activity className="h-4 w-4" />
                    Events/sec
                  </div>
                  <div className="mt-2 text-xl font-semibold">
                    {events.toFixed(1)}M
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    Processing bus
                  </div>
                </div>
              </div>
            </motion.div>

            {/* right */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="flex flex-col justify-between"
            >
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-widest text-white/70">
                    Integrations
                  </p>
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]" />
                </div>

                <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {logos.map(({ Icon, name }) => (
                    <div
                      key={name}
                      className="group grid place-items-center rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
                    >
                      <Icon className="text-3xl text-white/55 transition group-hover:text-white" />
                      <span className="mt-3 text-xs text-white/60">
                        {name}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-[12px] text-white/70">
                  <div className="flex items-center justify-between">
                    <span className="text-white/55">Status</span>
                    <span className="text-emerald-300">Operational</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-white/55">Deploy</span>
                    <span className="text-blue-200">Rolling</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-white/55">Security</span>
                    <span className="text-white/80">Sncryption • Audit</span>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-white/45">
                Trusted by developers worldwide
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
