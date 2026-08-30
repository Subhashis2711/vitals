"use client";

import type { Goal, Project, Todo, TodoStatus } from "@vitals/shared";
import { Check, CheckCircle2, Circle, Clock3, Play, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GoalSelect } from "@/components/GoalSelect";
import { ProjectSelect } from "@/components/ProjectSelect";
import { RecurrencePicker } from "@/components/RecurrencePicker";
import { updateTodo } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { fieldInputClass } from "@/lib/fieldStyles";
import { modalCloseButtonClass, modalDeleteButtonClass, modalSaveButtonClass } from "@/lib/modalIconButton";
import { usePomodoro } from "@/lib/pomodoro-context";

const STATUS_LABELS: Record<TodoStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const STATUS_ICON: Record<TodoStatus, typeof Circle> = {
  todo: Circle,
  in_progress: Clock3,
  done: CheckCircle2,
};

// One line of context above the Start Focus button, tailored to the todo's
// (draft) state — a due date takes priority over status since "overdue"/
// "due today" is more actionable than a generic in-progress nudge.
function focusPrompt(status: TodoStatus, dueDate: string): string {
  if (dueDate) {
    const today = new Date().toLocaleDateString("en-CA");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString("en-CA");
    if (dueDate < today) return "Overdue — got 25 minutes to catch up?";
    if (dueDate === today) return "Due today — got 25 minutes now?";
    if (dueDate === tomorrowStr) return "Due tomorrow — got 25 minutes now?";
  }
  if (status === "in_progress") return "In progress — pick up where you left off?";
  return "Ready to focus on this?";
}

export function TodoDetailModal({
  todo,
  projects,
  goals,
  onClose,
  onChange,
  onDelete,
}: {
  todo: Todo;
  projects: Project[];
  goals: Goal[];
  onClose: () => void;
  onChange: (todo: Todo, nextTodo?: Todo | null) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const router = useRouter();
  const { setMode, setLinkedTodo } = usePomodoro();
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? "");
  const [status, setStatus] = useState(todo.status);
  const [dueDate, setDueDate] = useState(todo.dueDate?.slice(0, 10) ?? "");
  const [projectId, setProjectId] = useState(todo.projectId ?? "");
  const [goalId, setGoalId] = useState(todo.goalId ?? "");
  const [recurrenceFreq, setRecurrenceFreq] = useState(todo.recurrenceFreq);
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState(todo.recurrenceDaysOfWeek);
  const [saving, setSaving] = useState(false);

  const dirty =
    title.trim() !== todo.title ||
    description.trim() !== (todo.description ?? "") ||
    status !== todo.status ||
    dueDate !== (todo.dueDate?.slice(0, 10) ?? "") ||
    projectId !== (todo.projectId ?? "") ||
    goalId !== (todo.goalId ?? "") ||
    recurrenceFreq !== todo.recurrenceFreq ||
    JSON.stringify(recurrenceDaysOfWeek) !== JSON.stringify(todo.recurrenceDaysOfWeek);

  // Shared by the save icon and "Start focus session" — the latter used to
  // navigate away silently discarding any unsaved edits. Both paths now go
  // through the same save, so navigating away can never drop edits.
  async function performSave(): Promise<boolean> {
    if (!title.trim()) return false;
    if (!dirty) return true;
    setSaving(true);
    try {
      const { todo: updated, nextTodo } = await updateTodo(todo.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        dueDate: dueDate || null,
        projectId: projectId || null,
        goalId: goalId || null,
        recurrenceFreq,
        recurrenceDaysOfWeek,
      });
      onChange(updated, nextTodo);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update todo");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    const ok = await performSave();
    if (ok) {
      toast.success("Todo saved");
      onClose();
    }
  }

  async function startFocus() {
    const ok = await performSave();
    if (!ok) return;
    setMode("focus");
    setLinkedTodo(todo.id, title.trim());
    router.push("/focus");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-16 sm:pt-24" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onDelete(todo.id, todo.title);
              onClose();
            }}
            title="Delete todo"
            className={modalDeleteButtonClass}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty || !title.trim()}
              title="Save"
              className={modalSaveButtonClass(dirty && Boolean(title.trim()))}
            >
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} title="Close" className={modalCloseButtonClass}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldInputClass}
          />

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATUS_LABELS) as TodoStatus[]).map((s) => {
              const Icon = STATUS_ICON[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    status === s
                      ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300"
                      : "border-neutral-300 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
            <p className="text-xs text-neutral-700 dark:text-neutral-300">{focusPrompt(status, dueDate)}</p>
            <button
              type="button"
              onClick={startFocus}
              disabled={saving}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              Start focus session
            </button>
          </div>

          <label className="block text-xs text-neutral-600 dark:text-neutral-500">
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={cn("mt-1", fieldInputClass)}
            />
          </label>

          <label className="block text-xs text-neutral-600 dark:text-neutral-500">
            Project
            <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} className="mt-1 w-full" />
          </label>

          <label className="block text-xs text-neutral-600 dark:text-neutral-500">
            Goal
            <GoalSelect goals={goals} value={goalId} onChange={setGoalId} className="mt-1 w-full" />
          </label>

          <label className="block text-xs text-neutral-600 dark:text-neutral-500">
            Repeat
            <div className="mt-1">
              <RecurrencePicker
                freq={recurrenceFreq}
                daysOfWeek={recurrenceDaysOfWeek}
                onChange={(freq, days) => {
                  setRecurrenceFreq(freq);
                  setRecurrenceDaysOfWeek(days);
                }}
              />
            </div>
          </label>

          <label className="block text-xs text-neutral-600 dark:text-neutral-500">
            Notes
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional details..."
              className={cn("mt-1", fieldInputClass)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
