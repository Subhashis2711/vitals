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
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className={fieldLabelClass}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={fieldInputClass} />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
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
          className="mt-3 flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-500 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete project
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <Target className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            Goals <span className="text-neutral-600 dark:text-neutral-500">({goals.length})</span>
          </h3>
          <ul className="space-y-1.5">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Link
                  href={`/goals/${encodeURIComponent(goal.id)}`}
                  className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <CircularProgress value={goal.progress} size={28} strokeWidth={3} />
                  <span className="truncate text-sm text-neutral-800 dark:text-neutral-200">{goal.title}</span>
                </Link>
              </li>
            ))}
            {goals.length === 0 && <li className="text-xs text-neutral-600 dark:text-neutral-500">No goals linked yet.</li>}
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <ListTodo className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            Todos <span className="text-neutral-600 dark:text-neutral-500">({openTodos} open / {todos.length})</span>
          </h3>
          <form onSubmit={handleAddTodo} className="mb-2 flex gap-1.5">
            <input
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="Add a todo..."
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={addingTodo || !newTodoTitle.trim()}
              className="flex shrink-0 items-center justify-center rounded-lg bg-cyan-400 px-2.5 text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
          <EditableTodoList todos={todos} onChange={setTodos} emptyMessage="No todos linked yet." />
          {todos.length > 0 && (
            <Link href="/todos" className="mt-2 inline-block text-xs text-neutral-600 dark:text-neutral-500 hover:text-cyan-600 dark:text-cyan-300">
              View all todos →
            </Link>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <StickyNote className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            Notes <span className="text-neutral-600 dark:text-neutral-500">({notes.length})</span>
          </h3>
          <ul className="space-y-1.5">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  href={`/notes/${encodeURIComponent(note.id)}`}
                  className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <ContentTypeIcon type={note.contentType} className="h-3.5 w-3.5 shrink-0 text-neutral-600 dark:text-neutral-500" />
                  <span className="truncate text-sm text-neutral-800 dark:text-neutral-200">{note.title ?? "Untitled"}</span>
                </Link>
              </li>
            ))}
            {notes.length === 0 && <li className="text-xs text-neutral-600 dark:text-neutral-500">No notes linked yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
