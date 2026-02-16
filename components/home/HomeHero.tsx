"use client";

import { motion } from "framer-motion";
import { ChevronDown, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";

const TICKERS = [
  { sym: "AAPL", pct: "+1.42%", dir: "up" },
  { sym: "NVDA", pct: "+2.11%", dir: "up" },
  { sym: "TSLA", pct: "-0.64%", dir: "down" },
  { sym: "MSFT", pct: "+0.37%", dir: "up" },
  { sym: "SPY", pct: "+0.52%", dir: "up" },
  { sym: "QQQ", pct: "+0.81%", dir: "up" },
  { sym: "BTC", pct: "+1.96%", dir: "up" },
  { sym: "ETH", pct: "-0.28%", dir: "down" },
  { sym: "EUR/USD", pct: "+0.12%", dir: "up" },
];

function MiniCandleWave() {
  // lightweight SVG “ghost chart” that feels stocky without a chart lib
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
      viewBox="0 0 1200 520"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="heroLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0)" />
          <stop offset="0.2" stopColor="rgba(147,197,253,0.55)" />
          <stop offset="0.6" stopColor="rgba(191,219,254,0.35)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id="heroGlow">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M0,340 C120,320 180,240 280,250 C360,260 410,300 520,270 C620,240 680,180 760,205 C860,245 900,320 1010,300 C1090,286 1130,250 1200,235"
        fill="none"
        stroke="url(#heroLine)"
        strokeWidth="2.5"
        filter="url(#heroGlow)"
      />
      <path
        d="M0,360 C140,330 190,300 290,315 C370,327 440,380 530,360 C640,336 690,260 770,280 C860,304 920,390 1020,370 C1100,354 1140,318 1200,300"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function HomeHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const tickerRow = useMemo(() => {
    // duplicate so the marquee looks continuous
    const row = [...TICKERS, ...TICKERS, ...TICKERS];
    return row;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      const section = canvas.parentElement as HTMLElement;
      canvas.width = section.offsetWidth;
      canvas.height = section.offsetHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 70 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.2 + 0.6,
    }));

    const mouse = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // soft vignette
      const g = ctx.createRadialGradient(
        canvas.width * 0.5,
        canvas.height * 0.35,
        0,
        canvas.width * 0.5,
        canvas.height * 0.35,
        Math.max(canvas.width, canvas.height) * 0.75
      );
      g.addColorStop(0, "rgba(255,255,255,0.06)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // link lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.strokeStyle = `rgba(255,255,255,${0.08 * (1 - dist / 140)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // mouse repulsion
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 180) {
          p.vx += mdx * 0.000008;
          p.vy += mdy * 0.000008;
        }

        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800" />

      {/* drifting grid + scanlines + noise (CSS-driven) */}
      <div className="absolute inset-0 bg-hero-grid opacity-[0.35]" />
      <div className="absolute inset-0 bg-scanlines opacity-[0.25]" />
      <div className="absolute inset-0 bg-noise opacity-[0.10]" />

      {/* “ghost chart” */}
      <MiniCandleWave />

      {/* particles canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-[1]" />

      {/* content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-44 pb-44 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-white/90 backdrop-blur"
        >
          <Sparkles className="h-4 w-4" />
          Live signals • AI insights • Risk controls
          <span className="ml-2 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-extrabold tracking-tight"
        >
          Trade like a pro.
          <br />
          <span className="text-blue-200">See the market, not the noise.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.8 }}
          className="mx-auto mt-7 max-w-2xl text-blue-100/95"
        >
          StockHorizon delivers real-time alerts, AI-ranked setups, and disciplined risk tooling —
          built for serious traders who want speed and clarity.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button className="h-11 px-6 rounded-full bg-white text-blue-700 hover:bg-white/90 shadow-[0_14px_40px_rgba(0,0,0,0.25)]">
            <Zap className="h-4 w-4" />
            View Live Dashboard
          </Button>
          <Button
            variant="outline"
            className="h-11 px-6 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            <ShieldCheck className="h-4 w-4" />
            See Risk Framework
          </Button>
        </motion.div>

        {/* micro trust chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.7 }}
          className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-3"
        >
          {[
            "Realtime alerts",
            "AI-ranked entries",
            "Stop/target guidance",
            "Backtest-ready logic",
            "Secure infrastructure",
          ].map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80 backdrop-blur"
            >
              {t}
            </span>
          ))}
        </motion.div>

        {/* chevron */}
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="mt-16 flex justify-center text-white/70"
        >
          <ChevronDown size={28} />
        </motion.div>
      </div>

      {/* ticker tape */}
      <div className="relative z-20 border-t border-white/10 bg-white/5 backdrop-blur">
        <div className="mx-auto max-w-7xl overflow-hidden px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-xs tracking-widest text-white/60">
              LIVE TAPE
            </span>
            <div className="relative flex-1 overflow-hidden">
              <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap">
                {tickerRow.map((t, idx) => (
                  <div
                    key={`${t.sym}-${idx}`}
                    className="flex items-center gap-2 text-sm text-white/85"
                  >
                    <span className="font-semibold">{t.sym}</span>
                    <span
                      className={
                        t.dir === "up"
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }
                    >
                      {t.pct}
                    </span>
                    <span className="text-white/30">•</span>
                  </div>
                ))}
              </div>

              {/* fade edges */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-blue-800/70 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-blue-800/70 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* wave to next section */}
      <svg
        viewBox="0 0 1440 140"
        className="absolute bottom-0 left-0 w-full translate-y-[1px] z-10"
        preserveAspectRatio="none"
      >
        <path
          fill="white"
          d="M0,80 C240,120 480,40 720,40 960,40 1200,120 1440,80 L1440,140 L0,140 Z"
        />
      </svg>
    </section>
  );
}
