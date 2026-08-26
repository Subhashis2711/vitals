"use client";

import type { Goal, Note, Project, Todo } from "@vitals/shared";
import {
  Activity,
  BookOpen,
  Calendar,
  Folder,
  HeartPulse,
  LayoutDashboard,
  ListTodo,
  PenLine,
  Repeat,
  StickyNote,
  Target,
  Timer,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getGoals, getNotes, getProjects, getTodos } from "@/lib/api-browser";
import { useUI } from "@/lib/ui-context";

const STATIC_PAGES: { title: string; href: string; icon: LucideIcon }[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Goals", href: "/goals", icon: Target },
  { title: "Projects", href: "/projects", icon: Folder },
  { title: "Todos", href: "/todos", icon: ListTodo },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  { title: "Focus", href: "/focus", icon: Timer },
  { title: "Notes", href: "/notes", icon: StickyNote },
  { title: "Learning", href: "/learning", icon: BookOpen },
  { title: "Journal", href: "/journal", icon: PenLine },
  { title: "Habits", href: "/habits", icon: Repeat },
  { title: "Health", href: "/health", icon: HeartPulse },
  { title: "Money", href: "/money", icon: Wallet },
];

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useUI();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setPaletteOpen]);

  useEffect(() => {
    if (paletteOpen && !loaded) {
      Promise.all([getTodos(), getNotes(), getProjects(), getGoals()]).then(([t, n, p, g]) => {
        setTodos(t.todos);
        setNotes(n.notes);
        setProjects(p.projects);
        setGoals(g.goals);
        setLoaded(true);
      });
    }
    if (!paletteOpen) setQuery("");
  }, [paletteOpen, loaded]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = STATIC_PAGES.filter((p) => !q || p.title.toLowerCase().includes(q));
    if (!q) return { pages, todos: [], notes: [], projects: [], goals: [] };
    return {
      pages,
      todos: todos.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 5),
      notes: notes.filter((n) => (n.title ?? "").toLowerCase().includes(q)).slice(0, 5),
      projects: projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5),
      goals: goals.filter((g) => g.title.toLowerCase().includes(q)).slice(0, 5),
    };
  }, [query, todos, notes, projects, goals]);

  function go(href: string) {
    router.push(href);
    setPaletteOpen(false);
  }

  if (!paletteOpen) return null;

  const nothingFound =
    query &&
    results.pages.length === 0 &&
    results.todos.length === 0 &&
    results.notes.length === 0 &&
    results.projects.length === 0 &&
    results.goals.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-16 sm:pt-24"
      onClick={() => setPaletteOpen(false)}
    >
      <div
        className="max-h-[75vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
          <Activity className="h-4 w-4 text-cyan-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump..."
            className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {results.pages.length > 0 && (
            <ResultGroup label="Pages">
              {results.pages.map((p) => (
                <ResultRow key={p.href} icon={p.icon} label={p.title} onClick={() => go(p.href)} />
              ))}
            </ResultGroup>
          )}
          {results.goals.length > 0 && (
            <ResultGroup label="Goals">
              {results.goals.map((g) => (
                <ResultRow key={g.id} icon={Target} label={g.title} onClick={() => go(`/goals/${encodeURIComponent(g.id)}`)} />
              ))}
            </ResultGroup>
          )}
          {results.projects.length > 0 && (
            <ResultGroup label="Projects">
              {results.projects.map((p) => (
                <ResultRow key={p.id} icon={Folder} label={p.name} onClick={() => go("/projects")} />
              ))}
            </ResultGroup>
          )}
          {results.notes.length > 0 && (
            <ResultGroup label="Notes">
              {results.notes.map((n) => (
                <ResultRow
                  key={n.id}
                  icon={StickyNote}
                  label={n.title ?? "Untitled"}
                  onClick={() => go(`/notes/${encodeURIComponent(n.id)}`)}
                />
              ))}
            </ResultGroup>
          )}
          {results.todos.length > 0 && (
            <ResultGroup label="Todos">
              {results.todos.map((t) => (
                <ResultRow key={t.id} icon={ListTodo} label={t.title} onClick={() => go("/todos")} />
              ))}
            </ResultGroup>
          )}
          {nothingFound && <p className="p-4 text-center text-sm text-neutral-500">No results</p>}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      {children}
    </div>
  );
}

function ResultRow({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-neutral-200 transition-colors hover:bg-neutral-800"
    >
      <Icon className="h-4 w-4 text-neutral-500" />
      {label}
    </button>
  );
}
