"use client";

import type { Todo } from "@vitals/shared";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Trash2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { deleteTodo, reorderTodos, updateTodo } from "@/lib/api-browser";
import { cn } from "@/lib/cn";

// Shared list rendering for any flat (non-Kanban) todo list — Goal and
// Project detail pages both use this so rename/reorder/toggle/delete stay in
// one place instead of drifting between copies. TodoBoard keeps its own
// implementation since it's grouped into status columns with different
// up/down bounds.
export function EditableTodoList({
  todos,
  onChange,
  emptyMessage = "No todos yet.",
}: {
  todos: Todo[];
  onChange: (todos: Todo[]) => void;
  emptyMessage?: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editingInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...todos].sort((a, b) => a.position - b.position);

  function startEditing(todo: Todo) {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
    requestAnimationFrame(() => editingInputRef.current?.select());
  }

  async function commitEdit() {
    const id = editingId;
    const nextTitle = editingTitle.trim();
    setEditingId(null);
    if (!id || !nextTitle) return;
    const original = todos.find((t) => t.id === id);
    if (!original || original.title === nextTitle) return;
    onChange(todos.map((t) => (t.id === id ? { ...t, title: nextTitle } : t)));
    try {
      await updateTodo(id, { title: nextTitle });
    } catch (err) {
      onChange(todos.map((t) => (t.id === id ? { ...t, title: original.title } : t)));
      toast.error(err instanceof Error ? err.message : "Couldn't rename todo");
    }
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  }

  async function toggleTodo(todo: Todo) {
    const nextStatus = todo.status === "done" ? "todo" : "done";
    const { todo: updated } = await updateTodo(todo.id, { status: nextStatus });
    onChange(todos.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleDelete(id: string) {
    onChange(todos.filter((t) => t.id !== id));
    await deleteTodo(id);
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
    <ul className="space-y-1.5">
      {sorted.map((todo, i) => {
        const isEditing = editingId === todo.id;
        return (
          <li
            key={todo.id}
            className="group flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 p-2 text-sm"
          >
            <button
              type="button"
              onClick={() => toggleTodo(todo)}
              className="shrink-0 text-neutral-500 hover:text-orange-400"
            >
              {todo.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <input
                  ref={editingInputRef}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleEditKeyDown}
                  autoFocus
                  className="w-full rounded border border-orange-500/60 bg-neutral-900 px-1.5 py-0.5 text-sm text-neutral-100 focus:outline-none"
                />
              ) : (
                <p
                  onDoubleClick={() => startEditing(todo)}
                  title="Double-click to rename"
                  className={cn(
                    "cursor-text truncate text-neutral-200",
                    todo.status === "done" && "text-neutral-500 line-through",
                  )}
                >
                  {todo.title}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => move(todo, "up")}
                disabled={i === 0}
                className="text-neutral-600 hover:text-orange-400 disabled:pointer-events-none disabled:opacity-30"
                title="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(todo, "down")}
                disabled={i === sorted.length - 1}
                className="text-neutral-600 hover:text-orange-400 disabled:pointer-events-none disabled:opacity-30"
                title="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(todo.id)}
              className="shrink-0 text-neutral-600 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
      {sorted.length === 0 && <li className="text-xs text-neutral-500">{emptyMessage}</li>}
    </ul>
  );
}
