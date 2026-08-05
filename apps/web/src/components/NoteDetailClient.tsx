"use client";

import type { Note, Project, Todo } from "@vitals/shared";
import { useState } from "react";
import { NoteEditor } from "@/components/NoteEditor";
import { NoteView } from "@/components/NoteView";

export function NoteDetailClient({
  note: initialNote,
  projects,
  linkedTodos,
}: {
  note: Note;
  projects: Project[];
  linkedTodos: Todo[];
}) {
  const [note, setNote] = useState(initialNote);
  const [editing, setEditing] = useState(false);
  const project = note.domain === "project" && note.domainId ? projects.find((p) => p.id === note.domainId) : undefined;

  if (editing) {
    return (
      <NoteEditor
        mode="edit"
        projects={projects}
        note={note}
        initialLinkedTodos={linkedTodos}
        onSaved={(updated) => {
          setNote(updated);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return <NoteView note={note} project={project} todos={linkedTodos} onEdit={() => setEditing(true)} />;
}
