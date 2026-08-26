import { extractNoteFields } from "@vitals/ai";
import { notesRepo, todosRepo } from "@vitals/db";
import { captureNoteRequestSchema, createNoteInputSchema, fromGid, updateNoteInputSchema } from "@vitals/shared";
import type { NoteDomain } from "@vitals/shared";
import type { FastifyInstance } from "fastify";
import { serializeNote, serializeTodo } from "../serializers";

// domainId's expected GID type depends on the sibling `domain` field, so it
// can't be validated with a single static gidSchema(...) in the shared Zod
// schema — decoded here instead. Returns null for "journal" (domainId is
// unused for journal notes) or when domainId wasn't provided.
function resolveDomainId(domain: NoteDomain, domainId: string | null | undefined): string | null {
  if (!domainId || domain === "journal") return null;
  const parsed = fromGid(domainId);
  if (parsed.type !== domain) {
    throw new Error(`domainId must be a "${domain}" GID, got a "${parsed.type}" GID`);
  }
  return parsed.id;
}

export async function notesRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { domain?: string; domainId?: string } }>("/", async (req, reply) => {
    if (!req.query.domain) {
      return { notes: (await notesRepo.listNotes(req.userId, req.workspaceId)).map(serializeNote) };
    }
    const domain = req.query.domain as NoteDomain;
    let domainId: string | null;
    try {
      domainId = resolveDomainId(domain, req.query.domainId);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "Invalid domainId" });
    }
    const notes = await notesRepo.listNotesByDomain(domain, req.userId, req.workspaceId, domainId ?? undefined);
    return { notes: notes.map(serializeNote) };
  });

  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const note = await notesRepo.getNoteById(id, req.userId, req.workspaceId);
    if (!note) return reply.code(404).send({ error: "Note not found" });
    return { note: serializeNote(note) };
  });

  app.post("/", async (req, reply) => {
    const parsed = createNoteInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const domain = parsed.data.domain ?? "project";
    let domainId: string | null;
    try {
      domainId = resolveDomainId(domain, parsed.data.domainId);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "Invalid domainId" });
    }
    const note = await notesRepo.createNote({ ...parsed.data, domain, domainId }, req.userId, req.workspaceId);
    return reply.code(201).send({ note: serializeNote(note) });
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const parsed = updateNoteInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { id } = fromGid(req.params.id);

    let domainId: string | null | undefined = parsed.data.domainId;
    if (parsed.data.domainId !== undefined) {
      const domain = parsed.data.domain ?? (await notesRepo.getNoteById(id, req.userId, req.workspaceId))?.domain ?? "project";
      try {
        domainId = resolveDomainId(domain, parsed.data.domainId);
      } catch (err) {
        return reply.code(400).send({ error: err instanceof Error ? err.message : "Invalid domainId" });
      }
    }

    const note = await notesRepo.updateNote(id, { ...parsed.data, domainId }, req.userId, req.workspaceId);
    if (!note) return reply.code(404).send({ error: "Note not found" });
    return { note: serializeNote(note) };
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const note = await notesRepo.deleteNote(id, req.userId, req.workspaceId);
    if (!note) return reply.code(404).send({ error: "Note not found" });
    return { note: serializeNote(note) };
  });

  // Captures raw text/URL content, runs it through the Gemini extraction
  // pipeline, and persists both the resulting note and any extracted todos.
  app.post("/capture", async (req, reply) => {
    const parsed = captureNoteRequestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { rawContent, sourceUrl } = parsed.data;

    let extraction;
    try {
      extraction = await extractNoteFields(rawContent, sourceUrl ?? null);
    } catch (err) {
      req.log.error(err);
      return reply.code(502).send({ error: "AI extraction failed" });
    }

    const note = await notesRepo.createNote(
      {
        title: extraction.title,
        content: rawContent,
        rawContent,
        contentType: extraction.contentType,
        sourceUrl: sourceUrl ?? null,
        aiSummary: extraction.summary,
        tags: extraction.tags,
      },
      req.userId,
      req.workspaceId,
    );

    const todos = await Promise.all(
      extraction.actionItems.map((title) =>
        todosRepo.createTodo(
          {
            title,
            source: "ai_extracted",
            sourceNoteId: note.id,
          },
          req.userId,
          req.workspaceId,
        ),
      ),
    );

    return reply.code(201).send({ note: serializeNote(note), todos: todos.map(serializeTodo) });
  });
}
