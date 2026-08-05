import { inferMarkdownFromText, markdownToPlainText } from "@vitals/ai";
import { markdownFromTextRequestSchema, markdownToTextRequestSchema } from "@vitals/shared";
import type { FastifyInstance } from "fastify";

export async function markdownRoutes(app: FastifyInstance) {
  app.post("/to-text", async (req, reply) => {
    const parsed = markdownToTextRequestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return { text: markdownToPlainText(parsed.data.markdown) };
  });

  app.post("/from-text", async (req, reply) => {
    const parsed = markdownFromTextRequestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      const markdown = await inferMarkdownFromText(parsed.data.text);
      return { markdown };
    } catch (err) {
      req.log.error(err);
      return reply.code(502).send({ error: "AI conversion failed" });
    }
  });
}
