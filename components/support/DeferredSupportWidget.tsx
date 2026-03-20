"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const SupportWidget = dynamic(() => import("./SupportWidget"), { ssr: false });

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number }
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

export default function DeferredSupportWidget() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const w = window as IdleWindow;

    const activate = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(activate, { timeout: 2000 });
      return () => {
        cancelled = true;
        if (typeof w.cancelIdleCallback === "function") {
          w.cancelIdleCallback(id);
        }
      };
    }

    const t = window.setTimeout(activate, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  if (!ready) return null;
  return <SupportWidget />;
}
