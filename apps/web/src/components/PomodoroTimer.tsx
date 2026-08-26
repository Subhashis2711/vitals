"use client";

import type { PomodoroSession, Todo } from "@vitals/shared";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { TodoSelect } from "@/components/TodoSelect";
import { getPomodoroSessions } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { formatTimer, usePomodoro, type PomodoroMode } from "@/lib/pomodoro-context";

const MODE_LABELS: Record<PomodoroMode, string> = {
  focus: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

export function PomodoroTimer({ todos, initialSessions }: { todos: Todo[]; initialSessions: PomodoroSession[] }) {
  const {
    mode,
    durationMin,
    remainingSeconds,
    running,
    linkedTodoId,
    focusSessionsToday,
    lastCompletedAt,
    setMode,
    setDurationMin,
    setLinkedTodo,
    start,
    pause,
    reset,
  } = usePomodoro();

  const [sessions, setSessions] = useState(initialSessions);

  // Refetch history whenever a focus session finishes (bumps lastCompletedAt).
  useEffect(() => {
    if (lastCompletedAt === null) return;
    getPomodoroSessions()
      .then(({ sessions }) => setSessions(sessions))
      .catch(() => {});
  }, [lastCompletedAt]);

  const totalSeconds = durationMin * 60;
  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex justify-center gap-1.5">
          {(Object.keys(MODE_LABELS) as PomodoroMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                mode === m ? "bg-cyan-400 text-white" : "text-neutral-400 hover:bg-neutral-800",
              )}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <p className="mt-6 text-center font-mono text-6xl font-bold tabular-nums text-neutral-50">
          {formatTimer(remainingSeconds)}
        </p>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            title="Reset"
            className="rounded-full border border-neutral-700 p-3 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={running ? pause : start}
            className="flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-500"
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Pause" : "Start"}
          </button>
          <label className="flex items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-2 text-xs text-neutral-400">
            min
            <input
              type="number"
              min={1}
              max={180}
              disabled={running}
              value={durationMin}
              onChange={(e) => setDurationMin(Math.max(1, Number(e.target.value) || 1))}
              className="w-12 bg-transparent text-center text-neutral-200 focus:outline-none disabled:opacity-50"
            />
          </label>
        </div>

        {mode === "focus" && todos.length > 0 && (
          <div className="mt-5 flex justify-center">
            <TodoSelect
              todos={todos}
              value={linkedTodoId ?? ""}
              onChange={(id) => setLinkedTodo(id || null, todos.find((t) => t.id === id)?.title ?? null)}
              placeholder="Not linked to a todo"
              className="w-full max-w-xs"
            />
          </div>
        )}

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
          <Timer className="h-3.5 w-3.5" />
          {focusSessionsToday} focus session{focusSessionsToday === 1 ? "" : "s"} today
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="mb-3 text-sm font-semibold text-neutral-200">Recent sessions</h3>
        <ul className="space-y-1.5">
          {sessions.slice(0, 10).map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 p-2 text-sm"
            >
              <span className="min-w-0 truncate text-neutral-200">{session.label ?? "Focus session"}</span>
              <span className="shrink-0 text-xs text-neutral-500">
                {session.durationMin}min · {new Date(session.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </li>
          ))}
          {sessions.length === 0 && <li className="text-xs text-neutral-600">No sessions logged yet.</li>}
        </ul>
      </div>
    </div>
  );
}
