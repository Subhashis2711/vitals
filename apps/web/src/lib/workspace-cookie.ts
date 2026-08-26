// Shared between lib/api.ts (reads via next/headers) and lib/api-browser.ts /
// the WorkspaceSwitcher (reads/writes via document.cookie) — must stay a
// plain (non-httpOnly) cookie since client-side code needs to set it.
export const WORKSPACE_ID_COOKIE = "vitals_workspace_id";

export function getWorkspaceIdFromDocument(): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${WORKSPACE_ID_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// One year, expressed in seconds — a workspace choice should stick around
// like any other durable preference, not expire mid-session.
export function setWorkspaceIdCookie(workspaceId: string) {
  document.cookie = `${WORKSPACE_ID_COOKIE}=${encodeURIComponent(workspaceId)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
