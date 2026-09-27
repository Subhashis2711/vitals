"use client";

import type { Goal, Note, Project, Todo } from "@vitals/shared";
import { ChevronDown, ChevronUp, ListTodo, Plus, StickyNote, Target, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CircularProgress } from "@/components/CircularProgress";
import { ContentTypeIcon } from "@/components/ContentTypeIcon";
import { EditableTodoList } from "@/components/EditableTodoList";
import { ReferenceBadge } from "@/components/ReferenceBadge";
import { createTodo, updateProject, deleteProject, reorderGoals } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { fieldInputClass, fieldInputCompactClass, fieldLabelClass } from "@/lib/fieldStyles";

export function ProjectDetail({
  project: initialProject,
  notes,
  todos: initialTodos,
  goals: initialGoals,
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
  const [goals, setGoals] = useState(initialGoals);
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
  const sortedGoals = [...goals].sort((a, b) => a.position - b.position);

  async function moveGoal(goal: Goal, direction: "up" | "down") {
    const index = sortedGoals.findIndex((item) => item.id === goal.id);
    const neighbor = direction === "up" ? sortedGoals[index - 1] : sortedGoals[index + 1];
    if (!neighbor) return;

    const goalPosition = goal.position;
    const neighborPosition = neighbor.position;
    setGoals((prev) => prev.map((item) => {
      if (item.id === goal.id) return { ...item, position: neighborPosition };
      if (item.id === neighbor.id) return { ...item, position: goalPosition };
      return item;
    }));
    try {
      const { goals: updated } = await reorderGoals(goal.id, neighbor.id);
      setGoals((prev) => prev.map((item) => updated.find((next) => next.id === item.id) ?? item));
    } catch (err) {
      setGoals((prev) => prev.map((item) => {
        if (item.id === goal.id) return { ...item, position: goalPosition };
        if (item.id === neighbor.id) return { ...item, position: neighborPosition };
        return item;
      }));
      toast.error(err instanceof Error ? err.message : "Couldn't reorder goal");
    }
  }

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
          className="mt-3 flex items-center gap-1 text-xs text-neutral-600 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
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
            {sortedGoals.map((goal, index) => (
              <li key={goal.id} className="group flex items-center gap-1">
                <Link
                  href={`/goals/${encodeURIComponent(goal.reference)}`}
                  className="min-w-0 flex-1 flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <CircularProgress value={goal.progress} size={28} strokeWidth={3} />
                  <span className="truncate text-sm text-neutral-800 dark:text-neutral-200">
                    <ReferenceBadge reference={goal.reference} className="mr-2" />
                    {goal.title}
                  </span>
                </Link>
                <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button type="button" onClick={() => moveGoal(goal, "up")} disabled={index === 0} title="Move goal up" className="-m-1.5 p-1.5 text-neutral-400 hover:text-cyan-600 disabled:pointer-events-none disabled:opacity-30 dark:text-neutral-600 dark:hover:text-cyan-300">
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => moveGoal(goal, "down")} disabled={index === sortedGoals.length - 1} title="Move goal down" className="-m-1.5 p-1.5 text-neutral-400 hover:text-cyan-600 disabled:pointer-events-none disabled:opacity-30 dark:text-neutral-600 dark:hover:text-cyan-300">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
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
              className={cn(fieldInputCompactClass, "min-w-0 flex-1")}
            />
            <button
              type="submit"
              disabled={addingTodo || !newTodoTitle.trim()}
              className="flex shrink-0 items-center justify-center rounded-lg bg-cyan-400 px-2.5 text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
          <EditableTodoList todos={todos} onChange={setTodos} projects={[project]} goals={goals} emptyMessage="No todos linked yet." />
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
                  href={`/notes/${encodeURIComponent(note.reference)}`}
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
