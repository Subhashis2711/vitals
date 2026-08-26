import { workspacesRepo } from "@vitals/db";
import { createWorkspaceInputSchema } from "@vitals/shared";
import type { FastifyInstance } from "fastify";

// Unlike every other route file, these run outside the workspace-resolution
// hook (see server.ts) — a client needs to be able to list/create workspaces
// before it has one selected.
export async function workspacesRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    const list = await workspacesRepo.listWorkspaces(req.userId);
    if (list.length > 0) return { workspaces: list };
    const defaultWorkspace = await workspacesRepo.getOrCreateDefaultWorkspace(req.userId);
    return { workspaces: [defaultWorkspace] };
  });

  app.post("/", async (req, reply) => {
    const parsed = createWorkspaceInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const workspace = await workspacesRepo.createWorkspace(parsed.data, req.userId);
    return reply.code(201).send({ workspace });
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const workspaces = await workspacesRepo.listWorkspaces(req.userId);
    if (workspaces.length <= 1) {
      return reply.code(400).send({ error: "A user must have at least one workspace" });
    }

    const workspace = await workspacesRepo.deleteWorkspace(req.params.id, req.userId);
    if (!workspace) return reply.code(404).send({ error: "Workspace not found" });
    return { workspace };
  });
}
