import { workspacesRepo } from "@vitals/db";
import type { FastifyInstance } from "fastify";

// Sets req.workspaceId from the `X-Workspace-Id` header, or replies 403 if it
// doesn't belong to the caller. With no header (e.g. a client that hasn't
// picked one yet), falls back to the user's default workspace, bootstrapping
// a "Personal" one on their very first request. Must run after registerAuth
// (needs req.userId) and only on routes that operate on workspace-scoped
// domain data — not on the /workspaces routes themselves, which a client
// needs to be able to call before it has chosen a workspace.
export function registerWorkspace(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    const header = req.headers["x-workspace-id"];
    const requestedId = Array.isArray(header) ? header[0] : header;

    if (requestedId) {
      const workspace = await workspacesRepo.getWorkspaceById(requestedId, req.userId);
      if (!workspace) {
        return reply.code(403).send({ error: "Unknown or inaccessible workspace" });
      }
      req.workspaceId = workspace.id;
      return;
    }

    const workspace = await workspacesRepo.getOrCreateDefaultWorkspace(req.userId);
    req.workspaceId = workspace.id;
  });
}
