import { Flame, Folder, ListTodo, StickyNote } from "lucide-react";
import Link from "next/link";
import { ContentTypeIcon } from "@/components/ContentTypeIcon";
import { HabitsTodayMini } from "@/components/HabitsTodayMini";
import { PageHeader } from "@/components/PageHeader";
import { ProjectBadge } from "@/components/ProjectBadge";
import { QuickCapture } from "@/components/QuickCapture";
import { StatCard } from "@/components/StatCard";
import { TodoBoard } from "@/components/TodoBoard";
import { getHabitLogs, getHabits, getNotes, getProjects, getTodos } from "@/lib/api";
import { friendlyDate } from "@/lib/date";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const todayStr = new Date().toLocaleDateString("en-CA");
  const [{ todos }, { notes }, { projects }, { habits }, { logs: todayLogs }] = await Promise.all([
    getTodos(),
    getNotes(),
    getProjects(),
    getHabits(),
    getHabitLogs(todayStr),
  ]);

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const openTodos = todos.filter((t) => t.status !== "done").length;

  const recentItems = [
    ...notes.map((n) => ({
      kind: "note" as const,
      id: n.id,
      title: n.title ?? "Untitled",
      createdAt: n.createdAt,
      contentType: n.contentType,
      projectId: n.domain === "project" ? n.domainId : null,
    })),
    ...todos.map((t) => ({
      kind: "todo" as const,
      id: t.id,
      title: t.title,
      createdAt: t.createdAt,
      contentType: undefined,
      projectId: t.projectId,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader title={greeting()} subtitle={`Here's what your second brain remembers · ${friendlyDate()}`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total notes" value={String(notes.length)} icon={StickyNote} accent="orange" />
        <StatCard label="Open todos" value={String(openTodos)} icon={ListTodo} accent="blue" />
        <StatCard label="Projects" value={String(projects.length)} icon={Folder} accent="amber" />
        <StatCard
          label="Habits today"
          value={habits.length > 0 ? `${todayLogs.length}/${habits.length}` : "—"}
          icon={Flame}
          accent="emerald"
        />
      </div>

      <QuickCapture />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-1.5 text-base font-semibold text-neutral-100">
            <ListTodo className="h-4.5 w-4.5 text-orange-400" />
            Todos
          </h2>
          <TodoBoard initialTodos={todos} projects={projects} />
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-100">
                <StickyNote className="h-4 w-4 text-orange-400" />
                Recent activity
              </h2>
              <Link href="/notes" className="text-xs text-neutral-500 hover:text-orange-400">
                View all
              </Link>
            </div>
            <ul className="space-y-1">
              {recentItems.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.kind === "note" ? `/notes/${encodeURIComponent(item.id)}` : "/todos"}
                    className="flex items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-neutral-800"
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        item.kind === "note" ? "bg-orange-500/15 text-orange-400" : "bg-blue-500/15 text-blue-400"
                      }`}
                    >
                      {item.kind === "note" && item.contentType ? (
                        <ContentTypeIcon type={item.contentType} className="h-3.5 w-3.5" />
                      ) : (
                        <ListTodo className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-200">{item.title}</span>
                      <span className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                        {timeAgo(item.createdAt)}
                        <ProjectBadge project={item.projectId ? projectById.get(item.projectId) : undefined} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {recentItems.length === 0 && <li className="text-xs text-neutral-500">Nothing captured yet.</li>}
            </ul>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-100">
                <Flame className="h-4 w-4 text-emerald-400" />
                Habits today
              </h2>
              <Link href="/habits" className="text-xs text-neutral-500 hover:text-orange-400">
                View all
              </Link>
            </div>
            <HabitsTodayMini habits={habits} todayLogs={todayLogs} />
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-100">
                <Folder className="h-4 w-4 text-amber-400" />
                Projects
              </h2>
              <Link href="/projects" className="text-xs text-neutral-500 hover:text-orange-400">
                View all
              </Link>
            </div>
            <ul className="space-y-2">
              {projects.slice(0, 5).map((project) => (
                <li key={project.id} className="flex items-center gap-2 truncate text-sm text-neutral-300">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: project.color ?? "#a3a3a3" }} />
                  <span className="truncate">{project.name}</span>
                </li>
              ))}
              {projects.length === 0 && <li className="text-xs text-neutral-500">No projects yet.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
