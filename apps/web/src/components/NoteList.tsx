"use client";

import { NOTE_CONTENT_TYPES, type Note, type NoteContentType, type Project } from "@vitals/shared";
import { Search, StickyNote } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ContentTypeIcon } from "@/components/ContentTypeIcon";
import { DeleteNoteButton } from "@/components/DeleteNoteButton";
import { ProjectBadge } from "@/components/ProjectBadge";
import { ProjectSelect } from "@/components/ProjectSelect";

const CONTENT_TYPE_LABELS: Record<NoteContentType, string> = {
  article: "Article",
  video: "Video",
  idea: "Idea",
  paste: "Paste",
};

export function NoteList({ initialNotes, projects }: { initialNotes: Note[]; projects: Project[] }) {
  const [notes] = useState(initialNotes);
  const [search, setSearch] = useState("");
  const [contentType, setContentType] = useState<string>("all");
  const [projectId, setProjectId] = useState("");

  const projectById = new Map(projects.map((p) => [p.id, p]));

  const visibleNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (contentType !== "all" && n.contentType !== contentType) return false;
      if (projectId && (n.domain !== "project" || n.domainId !== projectId)) return false;
      if (q && !(n.title ?? "").toLowerCase().includes(q) && !(n.aiSummary ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [notes, search, contentType, projectId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
          />
        </div>
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-300 focus:border-cyan-400/60 focus:outline-none"
        >
          <option value="all">All types</option>
          {NOTE_CONTENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {CONTENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {projects.length > 0 && (
          <ProjectSelect
            projects={projects}
            value={projectId}
            onChange={setProjectId}
            placeholder="All projects"
            className="border-neutral-800 bg-neutral-900 py-1.5 text-sm"
          />
        )}
      </div>

      <ul className="space-y-2">
        {visibleNotes.map((note) => (
          <li
            key={note.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3 transition-colors hover:border-neutral-700"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/notes/${encodeURIComponent(note.id)}`} className="font-medium text-neutral-100 hover:text-cyan-300">
                  {note.title ?? "Untitled"}
                </Link>
                <p className="mt-1 flex items-center gap-1 text-xs uppercase tracking-wide text-neutral-500">
                  <ContentTypeIcon type={note.contentType} className="h-3 w-3" />
                  {note.contentType}
                </p>
                {note.aiSummary && <p className="mt-1 text-sm text-neutral-400">{note.aiSummary}</p>}
                <div className="mt-1.5">
                  <ProjectBadge
                    project={note.domain === "project" && note.domainId ? projectById.get(note.domainId) : undefined}
                  />
                </div>
              </div>
              <DeleteNoteButton id={note.id} title={note.title ?? "Untitled"} />
            </div>
          </li>
        ))}
        {visibleNotes.length === 0 && (
          <li className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-800 py-10 text-sm text-neutral-500">
            <StickyNote className="h-6 w-6" />
            {notes.length === 0 ? "No notes yet." : "No notes match your filters."}
          </li>
        )}
      </ul>
    </div>
  );
}
