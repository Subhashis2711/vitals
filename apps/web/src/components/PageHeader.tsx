"use client";

import { Search, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useUI } from "@/lib/ui-context";

export function PageHeader({ title, subtitle }: { title: ReactNode; subtitle?: string }) {
  const { setPaletteOpen, setCaptureOpen } = useUI();

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-50">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full border border-neutral-800 px-2.5 py-1.5 text-xs text-neutral-400 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Local
        </span>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search or jump...</span>
          <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={() => setCaptureOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-cyan-400/30 transition-colors hover:bg-cyan-500"
        >
          <Zap className="h-3.5 w-3.5" />
          Capture
        </button>
      </div>
    </div>
  );
}
