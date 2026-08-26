"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { createPomodoroSession, getPomodoroSessions } from "@/lib/api-browser";
import { todayISO } from "@/lib/date";

export type PomodoroMode = "focus" | "shortBreak" | "longBreak";

const DEFAULT_DURATIONS: Record<PomodoroMode, number> = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

const STORAGE_KEY = "vitals:pomodoro";

interface StoredState {
  mode: PomodoroMode;
  durations: Record<PomodoroMode, number>;
  endAt: number | null;
  remainingWhenPaused: number | null;
  linkedTodoId: string | null;
  linkedTodoTitle: string | null;
}

interface PomodoroContextValue {
  mode: PomodoroMode;
  durationMin: number;
  remainingSeconds: number;
  running: boolean;
  linkedTodoId: string | null;
  linkedTodoTitle: string | null;
  focusSessionsToday: number;
  lastCompletedAt: number | null;
  setMode: (mode: PomodoroMode) => void;
  setDurationMin: (min: number) => void;
  setLinkedTodo: (id: string | null, title: string | null) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PomodoroMode>("focus");
  const [durations, setDurations] = useState<Record<PomodoroMode, number>>(DEFAULT_DURATIONS);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remainingWhenPaused, setRemainingWhenPaused] = useState<number | null>(null);
  const [linkedTodoId, setLinkedTodoId] = useState<string | null>(null);
  const [linkedTodoTitle, setLinkedTodoTitle] = useState<string | null>(null);
  const [focusSessionsToday, setFocusSessionsToday] = useState(0);
  const [lastCompletedAt, setLastCompletedAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);

  // A ref would flip to true synchronously before the setState calls below
  // land, so the write-effect could fire once with pre-load default values
  // in between — using state instead means "hydrated" and the loaded values
  // always commit in the same render, so the write-effect never fires early.
  const [hydrated, setHydrated] = useState(false);

  // Runs once after mount — restores an in-progress timer across page
  // reloads and seeds today's count from the server (source of truth, so a
  // second tab/device logging a session isn't silently missed).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredState;
        setModeState(stored.mode);
        setDurations(stored.durations);
        setEndAt(stored.endAt);
        setRemainingWhenPaused(stored.remainingWhenPaused);
        setLinkedTodoId(stored.linkedTodoId);
        setLinkedTodoTitle(stored.linkedTodoTitle);
      }
    } catch {
      // Corrupt/blocked storage — just start fresh.
    }
    setHydrated(true);

    getPomodoroSessions(new Date(`${todayISO()}T00:00:00`).toISOString())
      .then(({ sessions }) => setFocusSessionsToday(sessions.length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: StoredState = { mode, durations, endAt, remainingWhenPaused, linkedTodoId, linkedTodoTitle };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, mode, durations, endAt, remainingWhenPaused, linkedTodoId, linkedTodoTitle]);

  useEffect(() => {
    if (endAt === null) return;
    const interval = setInterval(() => {
      if (Date.now() >= endAt) {
        clearInterval(interval);
        void completeSession();
      } else {
        forceTick((t) => t + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endAt]);

  async function completeSession() {
    const finishedMode = mode;
    const finishedDuration = durations[mode];
    setEndAt(null);
    setRemainingWhenPaused(null);

    if (finishedMode === "focus") {
      try {
        await createPomodoroSession({
          todoId: linkedTodoId ?? undefined,
          label: linkedTodoTitle ?? undefined,
          durationMin: finishedDuration,
          startedAt: new Date(Date.now() - finishedDuration * 60_000).toISOString(),
          completedAt: new Date().toISOString(),
        });
      } catch {
        // Best-effort logging — don't block the timer UI on a network blip.
      }
      const nextCount = focusSessionsToday + 1;
      setFocusSessionsToday(nextCount);
      setLastCompletedAt(Date.now());
      toast.success("Pomodoro complete — take a break.");
      setModeState(nextCount % 4 === 0 ? "longBreak" : "shortBreak");
    } else {
      toast("Break's over. Ready for another round?");
      setModeState("focus");
    }
  }

  const remainingSeconds = endAt !== null ? Math.max(0, Math.ceil((endAt - Date.now()) / 1000)) : (remainingWhenPaused ?? durations[mode] * 60);

  const value: PomodoroContextValue = {
    mode,
    durationMin: durations[mode],
    remainingSeconds,
    running: endAt !== null,
    linkedTodoId,
    linkedTodoTitle,
    focusSessionsToday,
    lastCompletedAt,
    setMode(next) {
      setEndAt(null);
      setRemainingWhenPaused(null);
      setModeState(next);
    },
    setDurationMin(min) {
      setDurations((prev) => ({ ...prev, [mode]: min }));
      setEndAt(null);
      setRemainingWhenPaused(null);
    },
    setLinkedTodo(id, title) {
      setLinkedTodoId(id);
      setLinkedTodoTitle(title);
    },
    start() {
      const remaining = remainingWhenPaused ?? durations[mode] * 60;
      setRemainingWhenPaused(null);
      setEndAt(Date.now() + remaining * 1000);
    },
    pause() {
      if (endAt === null) return;
      setRemainingWhenPaused(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
      setEndAt(null);
    },
    reset() {
      setEndAt(null);
      setRemainingWhenPaused(null);
    },
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro must be used within PomodoroProvider");
  return ctx;
}
