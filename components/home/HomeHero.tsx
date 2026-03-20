"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

function MiniCandleWave() {
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

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

export default function HomeHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowPowerDevice =
      (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
      navigator.hardwareConcurrency <= 4;

    const particleCount = lowPowerDevice
      ? 22
      : window.innerWidth < 768
        ? 28
        : window.innerWidth < 1280
          ? 34
          : 42;

    const particles: Particle[] = Array.from({ length: particleCount }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1 + 0.5,
    }));

    const mouse = { x: -9999, y: -9999 };

    let raf = 0;
    let lastTime = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let isVisible = document.visibilityState === "visible";
    let inViewport = true;

    const frameInterval = lowPowerDevice ? 1000 / 24 : 1000 / 30;
    const connectDistance = lowPowerDevice ? 95 : 115;

    const toPx = (v: number, total: number) => v * total;

    const resize = () => {
      const rect = section.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const onPointerLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const schedule = () => {
      if (raf || !isVisible || !inViewport) return;
      raf = requestAnimationFrame(draw);
    };

    const draw = (time: number) => {
      raf = 0;
      if (!isVisible || !inViewport) return;

      if (time - lastTime < frameInterval) {
        schedule();
        return;
      }
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const g = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        0,
        width * 0.5,
        height * 0.35,
        Math.max(width, height) * 0.72
      );
      g.addColorStop(0, "rgba(255,255,255,0.05)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p, i) => {
        const px = toPx(p.x, width);
        const py = toPx(p.y, height);

        p.x += p.vx / width;
        p.y += p.vy / height;

        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const p2x = toPx(p2.x, width);
          const p2y = toPx(p2.y, height);
          const dx = px - p2x;
          const dy = py - p2y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectDistance) {
            ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - dist / connectDistance)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(p2x, p2y);
            ctx.stroke();
          }
        }

        const mdx = px - mouse.x;
        const mdy = py - mouse.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 150) {
          p.vx += mdx * 0.000005;
          p.vy += mdy * 0.000005;
        }

        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      schedule();
    };

    const onVisibilityChange = () => {
      isVisible = document.visibilityState === "visible";
      if (isVisible) schedule();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry.isIntersecting;
        if (inViewport) schedule();
      },
      { threshold: 0.06 }
    );

    resize();
    observer.observe(section);
    schedule();

    section.addEventListener("pointermove", onPointerMove, { passive: true });
    section.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [reduceMotion]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800" />
      <div className="absolute inset-0 bg-hero-grid opacity-[0.35]" />
      <div className="absolute inset-0 bg-scanlines opacity-[0.25]" />
      <div className="absolute inset-0 bg-noise opacity-[0.10]" />

      <MiniCandleWave />
      <canvas ref={canvasRef} className="absolute inset-0 z-[1]" />

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
          StockHorizon delivers real-time alerts, AI-ranked setups, and disciplined risk tooling -
          built for serious traders who want speed and clarity.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button className="h-11 px-6 rounded-full bg-white text-blue-700 hover:bg-white/90">
            <Zap className="h-4 w-4" />
            View Live Dashboard
          </Button>
          <Button variant="outline" className="h-11 px-6 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10">
            <ShieldCheck className="h-4 w-4" />
            See Risk Framework
          </Button>
        </motion.div>

        <motion.div
          animate={reduceMotion ? undefined : { y: [0, 12, 0] }}
          transition={reduceMotion ? undefined : { repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="mt-16 flex justify-center text-white/70"
        >
          <ChevronDown size={28} />
        </motion.div>
      </div>

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
