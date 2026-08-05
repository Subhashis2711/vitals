"use client";

import { TODO_STATUSES, type Project, type Todo, type TodoStatus } from "@vitals/shared";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Clock3, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { ProjectBadge } from "@/components/ProjectBadge";
import { ProjectSelect } from "@/components/ProjectSelect";
import { createTodo, deleteTodo, reorderTodos, updateTodo } from "@/lib/api-browser";
import { cn } from "@/lib/cn";

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

export function TodoBoard({ initialTodos, projects }: { initialTodos: Todo[]; projects: Project[] }) {
  const [todos, setTodos] = useState(initialTodos);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editingInputRef = useRef<HTMLInputElement>(null);

  const projectById = new Map(projects.map((p) => [p.id, p]));

  const visibleTodos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todos.filter((t) => {
      if (filterProjectId && t.projectId !== filterProjectId) return false;
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [todos, search, filterProjectId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const { todo } = await createTodo({ title: title.trim(), projectId: projectId || undefined });
      setTodos((prev) => [todo, ...prev]);
      setTitle("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create todo");
    } finally {
      setSubmitting(false);
    }
  }

  async function cycleStatus(todo: Todo) {
    const { todo: updated } = await updateTodo(todo.id, { status: NEXT_STATUS[todo.status] });
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleDelete(id: string, todoTitle: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await deleteTodo(id);
    toast(`Deleted "${todoTitle}"`);
  }

  function startEditing(todo: Todo) {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
    // Focus after the input mounts.
    requestAnimationFrame(() => editingInputRef.current?.select());
  }

  async function commitEdit() {
    const id = editingId;
    const nextTitle = editingTitle.trim();
    setEditingId(null);
    if (!id || !nextTitle) return;
    const original = todos.find((t) => t.id === id);
    if (!original || original.title === nextTitle) return;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, title: nextTitle } : t)));
    try {
      await updateTodo(id, { title: nextTitle });
    } catch (err) {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, title: original.title } : t)));
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
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New todo..."
          className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        />
        {projects.length > 0 && <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} />}
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search todos..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-orange-500/60 focus:outline-none"
          />
        </div>
        {projects.length > 0 && (
          <ProjectSelect
            projects={projects}
            value={filterProjectId}
            onChange={setFilterProjectId}
            placeholder="All projects"
            className="border-neutral-800 bg-neutral-900 py-1.5 text-sm"
          />
        )}
      </div>

      <p className="text-xs text-neutral-600">Double-click a todo to rename it · use the arrows to reorder within a column.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TODO_STATUSES.map((status) => {
          const items = visibleTodos.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
          return (
            <div key={status} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-400">
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
                {STATUS_LABELS[status]}
                <span className="ml-auto text-xs font-normal text-neutral-600">{items.length}</span>
              </h3>
              <ul className="space-y-1.5">
                {items.map((todo, i) => {
                  const StatusIcon = STATUS_ICON[todo.status];
                  const project = todo.projectId ? projectById.get(todo.projectId) : undefined;
                  const isEditing = editingId === todo.id;
                  return (
                    <li
                      key={todo.id}
                      className="group flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 p-2 text-sm transition-colors hover:border-neutral-700"
                    >
                      <button
                        type="button"
                        onClick={() => cycleStatus(todo)}
                        title="Click to advance status"
                        className="mt-0.5 shrink-0 text-neutral-500 transition-colors hover:text-orange-400"
                      >
                        <StatusIcon className="h-4 w-4" />
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
                              "cursor-text break-words text-neutral-200",
                              todo.status === "done" && "text-neutral-500 line-through",
                            )}
                          >
                            {todo.title}
                          </p>
                        )}
                        {(todo.tags.length > 0 || project) && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <ProjectBadge project={project} />
                            {todo.tags.map((tag) => (
                              <span key={tag} className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => moveTodo(status, todo, "up")}
                          disabled={i === 0}
                          className="text-neutral-600 hover:text-orange-400 disabled:pointer-events-none disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTodo(status, todo, "down")}
                          disabled={i === items.length - 1}
                          className="text-neutral-600 hover:text-orange-400 disabled:pointer-events-none disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(todo.id, todo.title)}
                        className="mt-0.5 shrink-0 text-neutral-600 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
                {items.length === 0 && <li className="text-xs text-neutral-600">Nothing here</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
