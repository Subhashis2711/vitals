import { healthRepo } from "@vitals/db";
import { createHealthActivityLogInputSchema, upsertHealthDailyLogInputSchema } from "@vitals/shared";
import type { FastifyInstance } from "fastify";

function defaultSinceDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("en-CA");
}

export async function healthRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { since?: string } }>("/daily", async (req) => {
    const since = req.query.since ?? defaultSinceDate(30);
    const logs = await healthRepo.listDailyLogsSince(since, req.userId);
    return { logs };
  });

  // Upserts by date — one daily log row per calendar day.
  app.post("/daily", async (req, reply) => {
    const parsed = upsertHealthDailyLogInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const log = await healthRepo.upsertDailyLog(parsed.data, req.userId);
    return reply.code(201).send({ log });
  });

  app.get<{ Querystring: { since?: string } }>("/activity", async (req) => {
    const since = req.query.since ?? defaultSinceDate(30);
    const logs = await healthRepo.listActivityLogsSince(since, req.userId);
    return { logs };
  });

  app.post("/activity", async (req, reply) => {
    const parsed = createHealthActivityLogInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const log = await healthRepo.createActivityLog(parsed.data, req.userId);
    return reply.code(201).send({ log });
  });

  app.delete<{ Params: { id: string } }>("/activity/:id", async (req, reply) => {
    const log = await healthRepo.deleteActivityLog(req.params.id, req.userId);
    if (!log) return reply.code(404).send({ error: "Activity log not found" });
    return { log };
  });
}
