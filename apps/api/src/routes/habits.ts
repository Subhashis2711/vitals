import { habitsRepo } from "@vitals/db";
import { createHabitInputSchema, toggleHabitLogInputSchema } from "@vitals/shared";
import type { FastifyInstance } from "fastify";

function defaultSinceDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toLocaleDateString("en-CA");
}

export async function habitsRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    const habits = await habitsRepo.listHabits(req.userId, req.workspaceId);
    return { habits };
  });

  app.post("/", async (req, reply) => {
    const parsed = createHabitInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const habit = await habitsRepo.createHabit(parsed.data, req.userId, req.workspaceId);
    return reply.code(201).send({ habit });
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const habit = await habitsRepo.deleteHabit(req.params.id, req.userId, req.workspaceId);
    if (!habit) return reply.code(404).send({ error: "Habit not found" });
    return { habit };
  });

  // List completions across all habits since a given date (defaults to the
  // last 30 days) — the frontend uses this to render the tracker grid.
  app.get<{ Querystring: { since?: string } }>("/logs", async (req) => {
    const since = req.query.since ?? defaultSinceDate();
    const logs = await habitsRepo.listHabitLogsSince(since, req.userId, req.workspaceId);
    return { logs };
  });

  app.post<{ Params: { id: string } }>("/:id/toggle", async (req, reply) => {
    const habit = await habitsRepo.getHabitById(req.params.id, req.userId, req.workspaceId);
    if (!habit) return reply.code(404).send({ error: "Habit not found" });

    const parsed = toggleHabitLogInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    return habitsRepo.toggleHabitLog(req.params.id, req.userId, req.workspaceId, parsed.data.date);
  });
}
