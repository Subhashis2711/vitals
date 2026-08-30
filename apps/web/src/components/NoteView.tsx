"use client";

import type { Note, Project, Todo } from "@vitals/shared";
import { CheckCircle2, Circle, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ContentTypeIcon } from "@/components/ContentTypeIcon";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { ProjectBadge } from "@/components/ProjectBadge";
import { deleteNote, deleteTodo, updateTodo } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { modalDeleteButtonClass } from "@/lib/modalIconButton";
import { rowIconButtonClass } from "@/lib/rowIconButton";

export function NoteView({
  note,
  project,
  todos: initialTodos,
  onEdit,
}: {
  note: Note;
  project: Project | undefined;
  todos: Todo[];
  onEdit: () => void;
}) {
  const router = useRouter();
  const [todos, setTodos] = useState(initialTodos);

  async function toggleTodo(todo: Todo) {
    const nextStatus = todo.status === "done" ? "todo" : "done";
    const { todo: updated } = await updateTodo(todo.id, { status: nextStatus });
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleDeleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await deleteTodo(id);
  }

  async function handleDeleteNote() {
    await deleteNote(note.id);
    toast(`Deleted "${note.title ?? "Untitled"}"`);
    router.push("/notes");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-500">
              <span className="flex items-center gap-1">
                <ContentTypeIcon type={note.contentType} className="h-3.5 w-3.5" />
                {note.contentType}
              </span>
              <ProjectBadge project={project} />
            </div>
            <h1 className="mt-1 truncate text-xl font-semibold text-neutral-950 dark:text-neutral-50">{note.title ?? "Untitled"}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button type="button" onClick={handleDeleteNote} title="Delete note" className={modalDeleteButtonClass}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {note.aiSummary && (
          <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-950/60 p-3 text-sm text-neutral-700 dark:text-neutral-300">
            {note.aiSummary}
          </div>
        )}

        {note.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <span key={tag} className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        {note.sourceUrl && (
          <a
            href={note.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex min-w-0 items-center gap-1 text-sm text-blue-400 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{note.sourceUrl}</span>
          </a>
        )}

        <div className="mt-4 border-t border-neutral-200 dark:border-neutral-800 pt-4">
          <MarkdownPreview content={note.content} />
        </div>
      </div>

      {todos.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Linked todos</h3>
          <ul className="space-y-1.5">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="group flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-950/60 p-2 text-sm"
              >
                <button type="button" onClick={() => toggleTodo(todo)} className="text-neutral-600 dark:text-neutral-500 hover:text-cyan-600 dark:text-cyan-300">
                  {todo.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>
                <span className={cn("flex-1 text-neutral-800 dark:text-neutral-200", todo.status === "done" && "text-neutral-600 dark:text-neutral-500 line-through")}>
                  {todo.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTodo(todo.id)}
                  className={cn(rowIconButtonClass, "-m-1.5")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
