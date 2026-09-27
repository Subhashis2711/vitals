"use client";

import type { Goal, Project, Todo } from "@vitals/shared";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TodoDetailModal } from "@/components/TodoDetailModal";
import { deleteTodo, reorderTodos, updateTodo } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { rowIconButtonClass } from "@/lib/rowIconButton";
import { ReferenceBadge } from "@/components/ReferenceBadge";

// Shared list rendering for any flat (non-Kanban) todo list — Goal and
// Project detail pages both use this so rename/reorder/toggle/delete stay in
// one place instead of drifting between copies. TodoBoard keeps its own
// implementation since it's grouped into status columns with different
// up/down bounds.
export function EditableTodoList({
  todos,
  onChange,
  projects = [],
  goals = [],
  emptyMessage = "No todos yet.",
}: {
  todos: Todo[];
  onChange: (todos: Todo[]) => void;
  projects?: Project[];
  goals?: Goal[];
  emptyMessage?: string;
}) {
  const [detailTodoId, setDetailTodoId] = useState<string | null>(null);

  const sorted = [...todos].sort((a, b) => a.position - b.position);

  async function toggleTodo(todo: Todo) {
    const nextStatus = todo.status === "done" ? "todo" : "done";
    const { todo: updated } = await updateTodo(todo.id, { status: nextStatus });
    onChange(todos.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleDelete(id: string) {
    onChange(todos.filter((t) => t.id !== id));
    await deleteTodo(id);
  }

  function applyTodoUpdate(updated: Todo, nextTodo?: Todo | null) {
    const next = todos.map((todo) => (todo.id === updated.id ? updated : todo));
    onChange(nextTodo ? [nextTodo, ...next] : next);
  }

  async function move(todo: Todo, direction: "up" | "down") {
    const index = sorted.findIndex((t) => t.id === todo.id);
    const neighbor = direction === "up" ? sorted[index - 1] : sorted[index + 1];
    if (!neighbor) return;

    const aPos = todo.position;
    const bPos = neighbor.position;
    onChange(
      todos.map((t) => {
        if (t.id === todo.id) return { ...t, position: bPos };
        if (t.id === neighbor.id) return { ...t, position: aPos };
        return t;
      }),
    );
    try {
      await reorderTodos(todo.id, neighbor.id);
    } catch (err) {
      onChange(
        todos.map((t) => {
          if (t.id === todo.id) return { ...t, position: aPos };
          if (t.id === neighbor.id) return { ...t, position: bPos };
          return t;
        }),
      );
      toast.error(err instanceof Error ? err.message : "Couldn't reorder todo");
    }
  }

  return (
    <>
      <ul className="space-y-1.5">
      {sorted.map((todo, i) => {
        return (
          <li
            key={todo.id}
            className="group flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-950/60 p-2 text-sm"
          >
            <button
              type="button"
              onClick={() => toggleTodo(todo)}
              className="shrink-0 text-neutral-600 dark:text-neutral-500 hover:text-cyan-600 dark:text-cyan-300"
            >
              {todo.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setDetailTodoId(todo.id)}
                title="View task details"
                className={cn(
                  "block w-full truncate text-left text-neutral-800 hover:text-cyan-700 dark:text-neutral-200 dark:hover:text-cyan-200",
                  todo.status === "done" && "text-neutral-600 dark:text-neutral-500 line-through",
                )}
              >
                <ReferenceBadge reference={todo.reference} className="mr-2" />
                {todo.title}
              </button>
            </div>
            <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => move(todo, "up")}
                disabled={i === 0}
                className="-m-1.5 p-1.5 text-neutral-400 dark:text-neutral-600 hover:text-cyan-600 dark:text-cyan-300 disabled:pointer-events-none disabled:opacity-30"
                title="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(todo, "down")}
                disabled={i === sorted.length - 1}
                className="-m-1.5 p-1.5 text-neutral-400 dark:text-neutral-600 hover:text-cyan-600 dark:text-cyan-300 disabled:pointer-events-none disabled:opacity-30"
                title="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(todo.id)}
              className={cn(rowIconButtonClass, "-m-1.5 shrink-0")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
        {sorted.length === 0 && <li className="text-xs text-neutral-600 dark:text-neutral-500">{emptyMessage}</li>}
      </ul>
      {detailTodoId && todos.some((todo) => todo.id === detailTodoId) && (
        <TodoDetailModal
          todo={todos.find((todo) => todo.id === detailTodoId)!}
          projects={projects}
          goals={goals}
          onClose={() => setDetailTodoId(null)}
          onChange={applyTodoUpdate}
          onDelete={(id) => void handleDelete(id)}
        />
      )}
    </>
  );
}
