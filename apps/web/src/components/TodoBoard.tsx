"use client";

import { TODO_STATUSES, type Goal, type Project, type Todo, type TodoStatus } from "@vitals/shared";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  Plus,
  Repeat,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { NewTodoModal } from "@/components/NewTodoModal";
import { ProjectBadge } from "@/components/ProjectBadge";
import { ProjectSelect } from "@/components/ProjectSelect";
import { TodoDetailModal } from "@/components/TodoDetailModal";
import { deleteTodo, reorderTodos, updateTodo } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { toISODate } from "@/lib/date";

function formatDueDate(dueDate: string): string {
  const isoDay = dueDate.slice(0, 10);
  return new Date(`${isoDay}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dueDate: string, status: TodoStatus): boolean {
  return status !== "done" && dueDate.slice(0, 10) < toISODate(new Date());
}

const STATUS_LABELS: Record<TodoStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const STATUS_DOT: Record<TodoStatus, string> = {
  todo: "bg-neutral-500",
  in_progress: "bg-amber-500",
  done: "bg-emerald-500",
};

const STATUS_ICON: Record<TodoStatus, typeof Circle> = {
  todo: Circle,
  in_progress: Clock3,
  done: CheckCircle2,
};

const NEXT_STATUS: Record<TodoStatus, TodoStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

export function TodoBoard({
  initialTodos,
  projects,
  goals = [],
}: {
  initialTodos: Todo[];
  projects: Project[];
  goals?: Goal[];
}) {
  const [todos, setTodos] = useState(initialTodos);
  const [createOpen, setCreateOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");

  const [editingDueDateId, setEditingDueDateId] = useState<string | null>(null);
  const [detailTodoId, setDetailTodoId] = useState<string | null>(null);

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const detailTodo = detailTodoId ? (todos.find((t) => t.id === detailTodoId) ?? null) : null;

  const visibleTodos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todos.filter((t) => {
      if (filterProjectId && t.projectId !== filterProjectId) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [todos, search, filterProjectId]);

  async function setTodoDueDate(todo: Todo, value: string) {
    setEditingDueDateId(null);
    const nextDueDate = value || null;
    if (nextDueDate === todo.dueDate) return;
    const original = todo.dueDate;
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, dueDate: nextDueDate } : t)));
    try {
      await updateTodo(todo.id, { dueDate: nextDueDate });
    } catch (err) {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, dueDate: original } : t)));
      toast.error(err instanceof Error ? err.message : "Couldn't update due date");
    }
  }

  function applyTodoUpdate(updated: Todo, nextTodo?: Todo | null) {
    setTodos((prev) => {
      const next = prev.map((t) => (t.id === updated.id ? updated : t));
      return nextTodo ? [nextTodo, ...next] : next;
    });
    if (nextTodo) toast.success(`"${nextTodo.title}" recurs — next one's already on the board.`);
  }

  async function cycleStatus(todo: Todo) {
    const { todo: updated, nextTodo } = await updateTodo(todo.id, { status: NEXT_STATUS[todo.status] });
    applyTodoUpdate(updated, nextTodo);
  }

  async function handleDelete(id: string, todoTitle: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await deleteTodo(id);
    toast(`Deleted "${todoTitle}"`);
  }

  async function moveTodo(status: TodoStatus, todo: Todo, direction: "up" | "down") {
    const columnItems = visibleTodos.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
    const index = columnItems.findIndex((t) => t.id === todo.id);
    const neighbor = direction === "up" ? columnItems[index - 1] : columnItems[index + 1];
    if (!neighbor) return;

    const aPos = todo.position;
    const bPos = neighbor.position;
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === todo.id) return { ...t, position: bPos };
        if (t.id === neighbor.id) return { ...t, position: aPos };
        return t;
      }),
    );
    try {
      await reorderTodos(todo.id, neighbor.id);
    } catch (err) {
      // revert on failure
      setTodos((prev) =>
        prev.map((t) => {
          if (t.id === todo.id) return { ...t, position: aPos };
          if (t.id === neighbor.id) return { ...t, position: bPos };
          return t;
        }),
      );
      toast.error(err instanceof Error ? err.message : "Couldn't reorder todo");
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 sm:w-auto"
      >
        <Plus className="h-4 w-4" />
        New Todo
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600 dark:text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search todos..."
            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-1.5 pl-8 pr-3 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
          />
        </div>
        {projects.length > 0 && (
          <ProjectSelect
            projects={projects}
            value={filterProjectId}
            onChange={setFilterProjectId}
            placeholder="All projects"
            className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-1.5 text-sm"
          />
        )}
      </div>

      <p className="text-xs text-neutral-400 dark:text-neutral-600">
        Click a todo's title for details, dates, project/goal, or to start a focus session · use the arrows to reorder.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TODO_STATUSES.map((status) => {
          const items = visibleTodos.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
          return (
            <div key={status} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
                {STATUS_LABELS[status]}
                <span className="ml-auto text-xs font-normal text-neutral-400 dark:text-neutral-600">{items.length}</span>
              </h3>
              <ul className="space-y-1.5">
                {items.map((todo, i) => {
                  const StatusIcon = STATUS_ICON[todo.status];
                  const project = todo.projectId ? projectById.get(todo.projectId) : undefined;
                  return (
                    <li
                      key={todo.id}
                      className="group flex items-start gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-950/60 p-2 text-sm transition-colors hover:border-neutral-400 dark:hover:border-neutral-700"
                    >
                      <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => moveTodo(status, todo, "up")}
                          disabled={i === 0}
                          className="-m-1.5 p-1.5 text-neutral-400 dark:text-neutral-600 hover:text-cyan-600 dark:text-cyan-300 disabled:pointer-events-none disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTodo(status, todo, "down")}
                          disabled={i === items.length - 1}
                          className="-m-1.5 p-1.5 text-neutral-400 dark:text-neutral-600 hover:text-cyan-600 dark:text-cyan-300 disabled:pointer-events-none disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => cycleStatus(todo)}
                        title="Click to advance status"
                        className="mt-0.5 shrink-0 text-neutral-600 dark:text-neutral-500 transition-colors hover:text-cyan-600 dark:text-cyan-300"
                      >
                        <StatusIcon className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          onClick={() => setDetailTodoId(todo.id)}
                          title="Click for details, dates, project/goal, or to start a focus session"
                          className={cn(
                            "cursor-pointer break-words text-neutral-800 dark:text-neutral-200 hover:text-cyan-700 dark:text-cyan-200",
                            todo.status === "done" && "text-neutral-600 dark:text-neutral-500 line-through",
                          )}
                        >
                          {todo.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <ProjectBadge project={project} />
                            {todo.tags.map((tag) => (
                              <span key={tag} className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                                {tag}
                              </span>
                            ))}
                            {editingDueDateId === todo.id ? (
                              <input
                                type="date"
                                autoFocus
                                defaultValue={todo.dueDate?.slice(0, 10) ?? ""}
                                onBlur={(e) => setTodoDueDate(todo, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                  if (e.key === "Escape") setEditingDueDateId(null);
                                }}
                                className="rounded border border-cyan-400/60 bg-white dark:bg-neutral-900 px-1 py-0.5 text-[10px] text-neutral-900 dark:text-neutral-100 focus:outline-none"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditingDueDateId(todo.id)}
                                title="Click to set due date"
                                className={cn(
                                  "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]",
                                  todo.dueDate
                                    ? isOverdue(todo.dueDate, todo.status)
                                      ? "bg-red-500/10 text-red-400"
                                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                                    : "text-neutral-400 dark:text-neutral-600 opacity-0 group-hover:opacity-100",
                                )}
                              >
                                <CalendarDays className="h-3 w-3" />
                                {todo.dueDate ? formatDueDate(todo.dueDate) : "Add date"}
                              </button>
                            )}
                            {todo.recurrenceFreq && (
                              <span
                                title={`Repeats ${todo.recurrenceFreq}`}
                                className="flex items-center gap-1 rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:text-neutral-400"
                              >
                                <Repeat className="h-3 w-3" />
                                {todo.recurrenceFreq}
                              </span>
                            )}
                          </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(todo.id, todo.title)}
                        className="-m-1.5 mt-0.5 shrink-0 p-1.5 text-neutral-400 dark:text-neutral-600 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
                {items.length === 0 && <li className="text-xs text-neutral-400 dark:text-neutral-600">Nothing here</li>}
              </ul>
            </div>
          );
        })}
      </div>

      {detailTodo && (
        <TodoDetailModal
          todo={detailTodo}
          projects={projects}
          goals={goals}
          onClose={() => setDetailTodoId(null)}
          onChange={applyTodoUpdate}
          onDelete={handleDelete}
        />
      )}

      {createOpen && (
        <NewTodoModal
          projects={projects}
          goals={goals}
          onClose={() => setCreateOpen(false)}
          onCreated={(todo) => setTodos((prev) => [todo, ...prev])}
        />
      )}
    </div>
  );
}
