import { calendarRepo } from "@vitals/db";
import { createCalendarEventInputSchema, updateCalendarEventInputSchema } from "@vitals/shared";
import type { FastifyInstance } from "fastify";

export async function calendarRoutes(app: FastifyInstance) {
  // ?dates=2026-08-03,2026-08-04,... — the frontend passes the visible
  // week's dates so we never have to fetch the entire events table.
  app.get<{ Querystring: { dates?: string } }>("/", async (req, reply) => {
    const dates = req.query.dates ? req.query.dates.split(",").filter(Boolean) : [];
    if (dates.length === 0) {
      return reply.code(400).send({ error: "dates query param is required (comma-separated YYYY-MM-DD)" });
    }
    const events = await calendarRepo.listCalendarEventsByDates(dates, req.userId);
    return { events };
  });

  app.post("/", async (req, reply) => {
    const parsed = createCalendarEventInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const event = await calendarRepo.createCalendarEvent(parsed.data, req.userId);
    return reply.code(201).send({ event });
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const parsed = updateCalendarEventInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const event = await calendarRepo.updateCalendarEvent(req.params.id, parsed.data, req.userId);
    if (!event) return reply.code(404).send({ error: "Event not found" });
    return { event };
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const event = await calendarRepo.deleteCalendarEvent(req.params.id, req.userId);
    if (!event) return reply.code(404).send({ error: "Event not found" });
    return { event };
  });
}
