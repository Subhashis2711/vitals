"use client";

import type { CalendarEvent, Todo, TodoStatus } from "@vitals/shared";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
  updateTodo,
} from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { addDays, getWeekDates, toISODate } from "@/lib/date";

const NEXT_STATUS: Record<TodoStatus, TodoStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const STATUS_ICON: Record<TodoStatus, typeof Circle> = {
  todo: Circle,
  in_progress: Clock3,
  done: CheckCircle2,
};

const START_HOUR = 6;
const END_HOUR = 22;
const ROW_HEIGHT = 48;
const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const COLOR_OPTIONS = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#eab308"];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(mins % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}`;
}

interface DraftEvent {
  id?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
}

export function WeekCalendar({
  initialWeekStart,
  initialEvents,
  initialTodos,
}: {
  initialWeekStart: string;
  initialEvents: CalendarEvent[];
  initialTodos: Todo[];
}) {
  const [weekStart, setWeekStart] = useState(new Date(`${initialWeekStart}T00:00:00`));
  const [events, setEvents] = useState(initialEvents);
  const [todos, setTodos] = useState(initialTodos);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DraftEvent | null>(null);

  const todosByDate = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const todo of todos) {
      if (!todo.dueDate) continue;
      const day = todo.dueDate.slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(todo);
      map.set(day, list);
    }
    return map;
  }, [todos]);

  async function cycleTodoStatus(todo: Todo) {
    const { todo: updated, nextTodo } = await updateTodo(todo.id, { status: NEXT_STATUS[todo.status] });
    setTodos((prev) => {
      const next = prev.map((t) => (t.id === updated.id ? updated : t));
      return nextTodo ? [nextTodo, ...next] : next;
    });
  }

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const todayStr = toISODate(new Date());

  async function loadWeek(dates: string[]) {
    setLoading(true);
    try {
      const { events: fetched } = await getCalendarEvents(dates);
      setEvents(fetched);
    } finally {
      setLoading(false);
    }
  }

  function navigate(deltaDays: number) {
    const next = addDays(weekStart, deltaDays);
    setWeekStart(next);
    loadWeek(getWeekDates(next).map(toISODate));
  }

  function goToday() {
    const next = new Date();
    setWeekStart(next);
    loadWeek(getWeekDates(next).map(toISODate));
  }

  function openCreate(date: string, hour: number) {
    const start = `${String(hour).padStart(2, "0")}:00`;
    setDraft({
      title: "",
      date,
      startTime: start,
      endTime: minutesToTime(timeToMinutes(start) + 60),
      color: COLOR_OPTIONS[0],
    });
  }

  function openEdit(event: CalendarEvent) {
    setDraft({
      id: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      color: event.color ?? COLOR_OPTIONS[0],
    });
  }

  async function saveDraft() {
    if (!draft || !draft.title.trim()) return;
    if (draft.id) {
      const { event } = await updateCalendarEvent(draft.id, draft);
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
    } else {
      const { event } = await createCalendarEvent(draft);
      setEvents((prev) => [...prev, event]);
    }
    setDraft(null);
  }

  async function deleteDraft() {
    if (!draft?.id) return;
    await deleteCalendarEvent(draft.id);
    setEvents((prev) => prev.filter((e) => e.id !== draft.id));
    toast("Block deleted");
    setDraft(null);
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const gridHeight = hours.length * ROW_HEIGHT;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate(-7)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-1.5 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigate(7)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-1.5 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {weekDates[0].toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div
        className={cn(
          "overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-opacity",
          loading && "opacity-50",
        )}
      >
        <div className="grid min-w-[720px] grid-cols-[56px_repeat(7,1fr)] border-b border-neutral-200 dark:border-neutral-800">
          <div />
          {weekDates.map((d, i) => {
            const iso = toISODate(d);
            return (
              <div key={iso} className="border-l border-neutral-200 dark:border-neutral-800 p-2 text-center">
                <p className="text-[10px] font-semibold tracking-wider text-neutral-600 dark:text-neutral-500">{DAY_LABELS[i]}</p>
                <p className={cn("text-sm font-medium", iso === todayStr ? "text-cyan-600 dark:text-cyan-300" : "text-neutral-800 dark:text-neutral-200")}>
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {todosByDate.size > 0 && (
          <div className="grid min-w-[720px] grid-cols-[56px_repeat(7,1fr)] border-b border-neutral-200 dark:border-neutral-800">
            <div className="p-1 text-right text-[9px] text-neutral-400 dark:text-neutral-600">Due</div>
            {weekDates.map((d) => {
              const iso = toISODate(d);
              const dueTodos = todosByDate.get(iso) ?? [];
              return (
                <div key={iso} className="flex flex-wrap gap-1 border-l border-neutral-200 dark:border-neutral-800 p-1">
                  {dueTodos.map((todo) => {
                    const StatusIcon = STATUS_ICON[todo.status];
                    return (
                      <button
                        key={todo.id}
                        type="button"
                        onClick={() => cycleTodoStatus(todo)}
                        title="Click to advance status"
                        className={cn(
                          "flex max-w-full items-center gap-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100/80 dark:bg-neutral-800/80 px-1.5 py-0.5 text-[10px] text-neutral-800 dark:text-neutral-200",
                          todo.status === "done" && "text-neutral-600 dark:text-neutral-500 line-through",
                        )}
                      >
                        <StatusIcon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{todo.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        <div className="relative grid min-w-[720px] grid-cols-[56px_repeat(7,1fr)]" style={{ height: gridHeight }}>
          <div className="relative">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: ROW_HEIGHT }}
                className="border-b border-neutral-200/60 dark:border-neutral-800/60 pr-2 text-right text-[10px] text-neutral-400 dark:text-neutral-600"
              >
                {h % 12 === 0 ? 12 : h % 12}
                {h < 12 ? "am" : "pm"}
              </div>
            ))}
          </div>
          {weekDates.map((d) => {
            const iso = toISODate(d);
            const dayEvents = events.filter((e) => e.date === iso);
            return (
              <div key={iso} className="relative border-l border-neutral-200 dark:border-neutral-800">
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => openCreate(iso, h)}
                    style={{ height: ROW_HEIGHT }}
                    className="block w-full border-b border-neutral-200/60 dark:border-neutral-800/60 transition-colors hover:bg-neutral-100/40 dark:hover:bg-neutral-800/40"
                  />
                ))}
                {dayEvents.map((event) => {
                  const startMin = timeToMinutes(event.startTime) - START_HOUR * 60;
                  const endMin = timeToMinutes(event.endTime) - START_HOUR * 60;
                  const top = (startMin / 60) * ROW_HEIGHT;
                  const height = Math.max(((endMin - startMin) / 60) * ROW_HEIGHT, 20);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openEdit(event)}
                      style={{
                        top,
                        height,
                        backgroundColor: `${event.color ?? "#f97316"}33`,
                        borderColor: event.color ?? "#f97316",
                      }}
                      className="absolute left-1 right-1 overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] font-medium text-neutral-900 dark:text-neutral-100"
                    >
                      <p className="truncate">{event.title}</p>
                      <p className="truncate text-[10px] text-neutral-700 dark:text-neutral-300">
                        {event.startTime}–{event.endTime}
                      </p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-neutral-400 dark:text-neutral-600">Click any empty slot to add a block · click a block to edit.</p>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-16 sm:pt-24" onClick={() => setDraft(null)}>
          <div
            className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{draft.id ? "Edit block" : "New block"}</h3>
              <button type="button" onClick={() => setDraft(null)} className="text-neutral-600 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <input
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Block title..."
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
              />
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-2 py-2 text-sm text-neutral-700 dark:text-neutral-300 focus:border-cyan-400/60 focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                  className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-2 py-2 text-sm text-neutral-700 dark:text-neutral-300 focus:border-cyan-400/60 focus:outline-none"
                />
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                  className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-2 py-2 text-sm text-neutral-700 dark:text-neutral-300 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraft({ ...draft, color: c })}
                    className={cn(
                      "h-5 w-5 rounded-full border-2",
                      draft.color === c ? "border-neutral-100" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between pt-1">
                {draft.id ? (
                  <button
                    type="button"
                    onClick={deleteDraft}
                    className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-500 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!draft.title.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
