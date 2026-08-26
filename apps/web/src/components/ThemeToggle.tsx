"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

// compact: icon-only button (mobile "more" dropdown row, next to other quick
// actions). Otherwise: a labelled row matching Settings' other preferences.
export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes only knows the real theme after mount (it reads
  // localStorage client-side) — rendering a guess before then risks a
  // hydration mismatch, so render a stable placeholder until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        {mounted && (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      <span className="flex items-center gap-2.5">
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        {mounted ? (isDark ? "Dark mode" : "Light mode") : "Theme"}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          isDark ? "bg-cyan-400" : "bg-neutral-300 dark:bg-neutral-700",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            isDark ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
