"use client";

import type { Goal, Project, Todo, TodoStatus, UpdateTodoInput } from "@vitals/shared";
import { CheckCircle2, Circle, Clock3, Play, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GoalSelect } from "@/components/GoalSelect";
import { ProjectSelect } from "@/components/ProjectSelect";
import { RecurrencePicker } from "@/components/RecurrencePicker";
import { updateTodo } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
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

  async function patch(input: UpdateTodoInput) {
    try {
      const { todo: updated, nextTodo } = await updateTodo(todo.id, input);
      onChange(updated, nextTodo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update todo");
    }
  }

  function commitDescription() {
    const trimmed = description.trim();
    if (trimmed === (todo.description ?? "")) return;
    patch({ description: trimmed || null });
  }

  function commitTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === todo.title) {
      setTitle(todo.title);
      return;
    }
    patch({ title: trimmed });
  }

  function startFocus() {
    setMode("focus");
    setLinkedTodo(todo.id, todo.title);
    router.push("/focus");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-16 sm:pt-24" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-200">Todo details</h3>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-neutral-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-cyan-400/60 focus:outline-none"
          />

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATUS_LABELS) as TodoStatus[]).map((s) => {
              const Icon = STATUS_ICON[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => patch({ status: s })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    todo.status === s
                      ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
                      : "border-neutral-700 text-neutral-400 hover:bg-neutral-800",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>

          <label className="block text-xs text-neutral-500">
            Due date
            <input
              type="date"
              value={todo.dueDate?.slice(0, 10) ?? ""}
              onChange={(e) => patch({ dueDate: e.target.value || null })}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus:border-cyan-400/60 focus:outline-none"
            />
          </label>

          <label className="block text-xs text-neutral-500">
            Project
            <ProjectSelect
              projects={projects}
              value={todo.projectId ?? ""}
              onChange={(id) => patch({ projectId: id || null })}
              className="mt-1 w-full"
            />
          </label>

          <label className="block text-xs text-neutral-500">
            Goal
            <GoalSelect
              goals={goals}
              value={todo.goalId ?? ""}
              onChange={(id) => patch({ goalId: id || null })}
              className="mt-1 w-full"
            />
          </label>

          <label className="block text-xs text-neutral-500">
            Repeat
            <div className="mt-1">
              <RecurrencePicker
                freq={todo.recurrenceFreq}
                daysOfWeek={todo.recurrenceDaysOfWeek}
                onChange={(freq, daysOfWeek) => patch({ recurrenceFreq: freq, recurrenceDaysOfWeek: daysOfWeek })}
              />
            </div>
          </label>

          <label className="block text-xs text-neutral-500">
            Notes
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={commitDescription}
              rows={2}
              placeholder="Optional details..."
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={startFocus}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
          >
            <Play className="h-3.5 w-3.5" />
            Start focus session
          </button>

          <button
            type="button"
            onClick={() => {
              onDelete(todo.id, todo.title);
              onClose();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-800 px-3 py-2 text-xs text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete todo
          </button>
        </div>
      </div>
    </div>
  );
}
