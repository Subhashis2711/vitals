"use client";

import type { Goal, Note, Project, Todo } from "@vitals/shared";
import { ListTodo, Plus, StickyNote, Target, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CircularProgress } from "@/components/CircularProgress";
import { ContentTypeIcon } from "@/components/ContentTypeIcon";
import { EditableTodoList } from "@/components/EditableTodoList";
import { createTodo, updateProject, deleteProject } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { fieldInputClass, fieldLabelClass } from "@/lib/fieldStyles";

const COLOR_OPTIONS = ["#f97316", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7"];

export function ProjectDetail({
  project: initialProject,
  notes,
  todos: initialTodos,
  goals,
}: {
  project: Project;
  notes: Note[];
  todos: Todo[];
  goals: Goal[];
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [name, setName] = useState(initialProject.name);
  const [description, setDescription] = useState(initialProject.description ?? "");
  const [color, setColor] = useState(initialProject.color ?? COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const [todos, setTodos] = useState(initialTodos);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [addingTodo, setAddingTodo] = useState(false);

  async function handleAddTodo(e: FormEvent) {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    setAddingTodo(true);
    try {
      const { todo } = await createTodo({ title: newTodoTitle.trim(), projectId: project.id });
      setTodos((prev) => [todo, ...prev]);
      setNewTodoTitle("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add todo");
    } finally {
      setAddingTodo(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { project: updated } = await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || null,
        color,
      });
      setProject(updated);
      toast.success("Project saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save project");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await deleteProject(project.id);
    toast(`Deleted "${project.name}"`);
    router.push("/projects");
  }

  const openTodos = todos.filter((t) => t.status !== "done").length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <div>
            <label className={fieldLabelClass}>Color</label>
            <div className="flex items-center gap-1.5 pt-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn("h-6 w-6 rounded-full border-2", color === c ? "border-neutral-100" : "border-transparent")}
                  style={{ backgroundColor: c }}
                  aria-label={`Choose color ${c}`}
                />
              ))}
            </div>
          </div>
          <div>
            <label className={fieldLabelClass}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldInputClass} />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            Save
          </button>
        </div>
        <div className="mt-3">
          <label className={fieldLabelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What is this project about?"
            className={cn(fieldInputClass, "mt-1.5")}
          />
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="mt-3 flex items-center gap-1 text-xs text-neutral-500 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete project
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-200">
            <Target className="h-4 w-4 text-orange-400" />
            Goals <span className="text-neutral-500">({goals.length})</span>
          </h3>
          <ul className="space-y-1.5">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Link
                  href={`/goals/${encodeURIComponent(goal.id)}`}
                  className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-800"
                >
                  <CircularProgress value={goal.progress} size={28} strokeWidth={3} />
                  <span className="truncate text-sm text-neutral-200">{goal.title}</span>
                </Link>
              </li>
            ))}
            {goals.length === 0 && <li className="text-xs text-neutral-500">No goals linked yet.</li>}
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-200">
            <ListTodo className="h-4 w-4 text-orange-400" />
            Todos <span className="text-neutral-500">({openTodos} open / {todos.length})</span>
          </h3>
          <form onSubmit={handleAddTodo} className="mb-2 flex gap-1.5">
            <input
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="Add a todo..."
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={addingTodo || !newTodoTitle.trim()}
              className="flex shrink-0 items-center justify-center rounded-lg bg-orange-500 px-2.5 text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
          <EditableTodoList todos={todos} onChange={setTodos} emptyMessage="No todos linked yet." />
          {todos.length > 0 && (
            <Link href="/todos" className="mt-2 inline-block text-xs text-neutral-500 hover:text-orange-400">
              View all todos →
            </Link>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-200">
            <StickyNote className="h-4 w-4 text-orange-400" />
            Notes <span className="text-neutral-500">({notes.length})</span>
          </h3>
          <ul className="space-y-1.5">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  href={`/notes/${encodeURIComponent(note.id)}`}
                  className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-800"
                >
                  <ContentTypeIcon type={note.contentType} className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                  <span className="truncate text-sm text-neutral-200">{note.title ?? "Untitled"}</span>
                </Link>
              </li>
            ))}
            {notes.length === 0 && <li className="text-xs text-neutral-500">No notes linked yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
