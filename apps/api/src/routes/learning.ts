import { learningRepo } from "@vitals/db";
import {
  createLearningResourceInputSchema,
  createLearningTopicInputSchema,
  fromGid,
  updateLearningTopicInputSchema,
} from "@vitals/shared";
import type { FastifyInstance } from "fastify";
import { serializeGoal, serializeNote, serializeResource, serializeTopic } from "../serializers";

// Roadmap items and insights aren't their own endpoints anymore — a roadmap
// step is a goal created with topicId set (POST /goals), an insight is a
// note created with domain: "learning" (POST /notes). See routes/goals.ts,
// routes/notes.ts.
export async function learningRoutes(app: FastifyInstance) {
  app.get("/topics", async (req) => {
    const topics = await learningRepo.listTopics(req.userId, req.workspaceId);
    return { topics: topics.map(serializeTopic) };
  });

  app.get<{ Params: { id: string } }>("/topics/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const detail = await learningRepo.getTopicDetail(id, req.userId, req.workspaceId);
    if (!detail) return reply.code(404).send({ error: "Topic not found" });
    return {
      topic: serializeTopic(detail.topic),
      roadmap: detail.roadmap.map(serializeGoal),
      resources: detail.resources.map(serializeResource),
      insights: detail.insights.map(serializeNote),
    };
  });

  app.post("/topics", async (req, reply) => {
    const parsed = createLearningTopicInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const topic = await learningRepo.createTopic(parsed.data, req.userId, req.workspaceId);
    return reply.code(201).send({ topic: serializeTopic(topic) });
  });

  app.patch<{ Params: { id: string } }>("/topics/:id", async (req, reply) => {
    const parsed = updateLearningTopicInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { id } = fromGid(req.params.id);
    const topic = await learningRepo.updateTopic(id, parsed.data, req.userId, req.workspaceId);
    if (!topic) return reply.code(404).send({ error: "Topic not found" });
    return { topic: serializeTopic(topic) };
  });

  app.delete<{ Params: { id: string } }>("/topics/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const topic = await learningRepo.deleteTopic(id, req.userId, req.workspaceId);
    if (!topic) return reply.code(404).send({ error: "Topic not found" });
    return { topic: serializeTopic(topic) };
  });

  app.post<{ Params: { id: string } }>("/topics/:id/resources", async (req, reply) => {
    const parsed = createLearningResourceInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { id: topicId } = fromGid(req.params.id);
    const resource = await learningRepo.addResource(topicId, parsed.data, req.userId, req.workspaceId);
    return reply.code(201).send({ resource: serializeResource(resource) });
  });

  app.delete<{ Params: { id: string } }>("/resources/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const resource = await learningRepo.deleteResource(id, req.userId, req.workspaceId);
    if (!resource) return reply.code(404).send({ error: "Resource not found" });
    return { resource: serializeResource(resource) };
  });
}
