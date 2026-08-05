import { journalRepo } from "@vitals/db";
import { fromGid, upsertJournalEntryInputSchema } from "@vitals/shared";
import type { FastifyInstance } from "fastify";
import { serializeJournalEntry } from "../serializers";

export async function journalRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    const entries = await journalRepo.listJournalEntries(req.userId);
    return { entries: entries.map(serializeJournalEntry) };
  });

  app.get<{ Querystring: { date?: string } }>("/by-date", async (req, reply) => {
    if (!req.query.date) return reply.code(400).send({ error: "date query param is required" });
    const entry = await journalRepo.getJournalEntryByDate(req.query.date, req.userId);
    return { entry: entry ? serializeJournalEntry(entry) : null };
  });

  // Upserts by date — one entry per calendar day.
  app.post("/", async (req, reply) => {
    const parsed = upsertJournalEntryInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const entry = await journalRepo.upsertJournalEntry(parsed.data, req.userId);
    return reply.code(201).send({ entry: serializeJournalEntry(entry) });
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const entry = await journalRepo.deleteJournalEntry(id, req.userId);
    if (!entry) return reply.code(404).send({ error: "Entry not found" });
    return { entry: serializeJournalEntry(entry) };
  });
}
