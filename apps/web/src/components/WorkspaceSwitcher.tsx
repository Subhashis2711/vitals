"use client";

import type { Workspace } from "@vitals/shared";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createWorkspace, deleteWorkspace, getWorkspaces } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { getWorkspaceIdFromDocument, setWorkspaceIdCookie } from "@/lib/workspace-cookie";

// Renders inline (expands in place) rather than as a positioned popover, so
// it works unmodified whether it's dropped into the desktop sidebar header
// or nested inside the mobile "more" dropdown — no z-index/overflow fights
// between two popovers.
export function WorkspaceSwitcher({ compact }: { compact?: boolean }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [deletingId, setDeletingId] = useState<string>();

  useEffect(() => {
    getWorkspaces().then(({ workspaces: list }) => {
      setWorkspaces(list);
      const current = getWorkspaceIdFromDocument();
      if (current && list.some((w) => w.id === current)) {
        setActiveId(current);
      } else if (list[0]) {
        // First-ever visit — pin the cookie to whatever the API already
        // defaulted to (see workspacesRepo.getOrCreateDefaultWorkspace), so
        // subsequent requests stay consistent with what's shown here.
        setWorkspaceIdCookie(list[0].id);
        setActiveId(list[0].id);
      }
    });
  }, []);

  function switchTo(id: string) {
    setExpanded(false);
    setCreating(false);
    if (id === activeId) return;
    setWorkspaceIdCookie(id);
    setActiveId(id);
    // Several workspace views hold their initial API response in client
    // component state. A router refresh updates server props but preserves
    // that state, which can make a newly selected workspace appear to contain
    // the previous workspace's data. Reload only after the cookie is updated
    // so every component is initialized from the selected workspace.
    window.location.reload();
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const { workspace } = await createWorkspace({ name });
    setWorkspaces((prev) => [...prev, workspace]);
    setNewName("");
    switchTo(workspace.id);
  }

  async function handleDelete(workspace: Workspace) {
    if (workspaces.length <= 1 || deletingId) return;
    if (!window.confirm(`Delete “${workspace.name}” and all of its data? This cannot be undone.`)) return;

    setDeletingId(workspace.id);
    try {
      await deleteWorkspace(workspace.id);
      const remaining = workspaces.filter((w) => w.id !== workspace.id);

      if (workspace.id === activeId) {
        // Choose another workspace before reloading so the next page cannot
        // request the workspace that was just deleted.
        setWorkspaceIdCookie(remaining[0].id);
        window.location.reload();
        return;
      }

      setWorkspaces(remaining);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Couldn't delete workspace");
    } finally {
      setDeletingId(undefined);
    }
  }

  const active = workspaces.find((w) => w.id === activeId);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex items-center gap-1 rounded-md text-left transition-colors",
          compact
            ? "-ml-0.5 px-0.5 py-0 text-[11px] text-neutral-600 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            : "w-full justify-between gap-2 px-2.5 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100",
        )}
      >
        <span className="min-w-0 truncate">{active?.name ?? "Workspace"}</span>
        <ChevronsUpDown className={cn("shrink-0", compact ? "h-3 w-3 text-neutral-400 dark:text-neutral-600" : "h-3.5 w-3.5")} />
      </button>

      {expanded && (
        <div className="mt-1 space-y-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-950/60 p-1.5">
          {workspaces.map((w) => (
            <div key={w.id} className="flex items-center gap-0.5 rounded-lg text-sm text-neutral-800 dark:text-neutral-200 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <button
                type="button"
                onClick={() => switchTo(w.id)}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-1.5 text-left"
              >
                <span className="min-w-0 truncate">{w.name}</span>
                {w.id === activeId && <Check className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
              </button>
              {workspaces.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDelete(w)}
                  disabled={Boolean(deletingId)}
                  aria-label={`Delete ${w.name}`}
                  title={`Delete ${w.name}`}
                  className="mr-1 rounded p-1.5 text-neutral-600 dark:text-neutral-500 transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {creating ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Workspace name"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-cyan-400/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCreate}
                className="shrink-0 rounded-lg bg-cyan-400 px-2.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              <Plus className="h-3.5 w-3.5" />
              New workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}
