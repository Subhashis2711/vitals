import { pomodoroRepo } from "@vitals/db";
import { createPomodoroSessionInputSchema, fromGid } from "@vitals/shared";
import type { FastifyInstance } from "fastify";
import { serializePomodoroSession } from "../serializers";

export async function pomodoroRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { since?: string; todoId?: string } }>("/", async (req) => {
    let sessions;
    if (req.query.todoId) {
      sessions = await pomodoroRepo.listPomodoroSessionsByTodoId(fromGid(req.query.todoId).id, req.userId, req.workspaceId);
    } else {
      sessions = await pomodoroRepo.listPomodoroSessions(req.userId, req.workspaceId, req.query.since);
    }
    return { sessions: sessions.map(serializePomodoroSession) };
  });

  app.post("/", async (req, reply) => {
    const parsed = createPomodoroSessionInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const session = await pomodoroRepo.createPomodoroSession(parsed.data, req.userId, req.workspaceId);
    return reply.code(201).send({ session: serializePomodoroSession(session) });
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const session = await pomodoroRepo.deletePomodoroSession(id, req.userId, req.workspaceId);
    if (!session) return reply.code(404).send({ error: "Session not found" });
    return { session: serializePomodoroSession(session) };
  });
}
