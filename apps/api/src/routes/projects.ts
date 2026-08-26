import { projectsRepo } from "@vitals/db";
import { createProjectInputSchema, fromGid, updateProjectInputSchema } from "@vitals/shared";
import type { FastifyInstance } from "fastify";
import { serializeProject } from "../serializers";

export async function projectsRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    const projects = await projectsRepo.listProjects(req.userId, req.workspaceId);
    return { projects: projects.map(serializeProject) };
  });

  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const project = await projectsRepo.getProjectById(id, req.userId, req.workspaceId);
    if (!project) return reply.code(404).send({ error: "Project not found" });
    return { project: serializeProject(project) };
  });

  app.post("/", async (req, reply) => {
    const parsed = createProjectInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const project = await projectsRepo.createProject(parsed.data, req.userId, req.workspaceId);
    return reply.code(201).send({ project: serializeProject(project) });
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const parsed = updateProjectInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { id } = fromGid(req.params.id);
    const project = await projectsRepo.updateProject(id, parsed.data, req.userId, req.workspaceId);
    if (!project) return reply.code(404).send({ error: "Project not found" });
    return { project: serializeProject(project) };
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const project = await projectsRepo.deleteProject(id, req.userId, req.workspaceId);
    if (!project) return reply.code(404).send({ error: "Project not found" });
    return { project: serializeProject(project) };
  });
}
