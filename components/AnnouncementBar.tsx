import { ShieldAlert } from "lucide-react";

export default function AnnouncementBar() {
  return (
    <aside className="relative z-50 h-8 border-b border-slate-800/80 bg-slate-950">
      <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-center gap-4 px-3 text-[11px] font-medium tracking-[0.02em] text-slate-100/95">
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <ShieldAlert className="h-3.5 w-3.5 text-sky-300/90" />
          Public Beta
        </span>

        <span className="inline-block text-slate-500">•</span>

        <span className="inline-flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-sky-300/90" />
          Use at your own risk.
        </span>

        <span className="hidden text-slate-500 md:inline-block">•</span>

        <div className="hidden items-center gap-1.5 md:inline-flex">
          <ShieldAlert className="h-3.5 w-3.5 text-sky-300/90" />
          By continuing, you acknowledge Terms and platform limitations.
        </div>
      </div>
    </aside>
  );
}
