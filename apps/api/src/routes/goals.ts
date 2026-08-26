import { goalsRepo, learningRepo } from "@vitals/db";
import { createGoalInputSchema, fromGid, updateGoalInputSchema } from "@vitals/shared";
import type { FastifyInstance } from "fastify";
import { serializeGoal, serializeTodo } from "../serializers";

export async function goalsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { projectId?: string; topicId?: string } }>("/", async (req) => {
    let goals;
    if (req.query.projectId) {
      goals = await goalsRepo.listGoalsByProjectId(fromGid(req.query.projectId).id, req.userId, req.workspaceId);
    } else if (req.query.topicId) {
      goals = await goalsRepo.listGoalsByTopicId(fromGid(req.query.topicId).id, req.userId, req.workspaceId);
    } else {
      goals = await goalsRepo.listGoals(req.userId, req.workspaceId);
    }
    return { goals: goals.map(serializeGoal) };
  });

  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const goal = await goalsRepo.getGoalById(id, req.userId, req.workspaceId);
    if (!goal) return reply.code(404).send({ error: "Goal not found" });
    const todos = await goalsRepo.listGoalTodos(id, req.userId, req.workspaceId);
    return { goal: serializeGoal(goal), todos: todos.map(serializeTodo) };
  });

  app.post("/", async (req, reply) => {
    const parsed = createGoalInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const goal = await goalsRepo.createGoal(parsed.data, req.userId, req.workspaceId);
    if (goal.topicId) await learningRepo.touchTopic(goal.topicId, req.userId, req.workspaceId);
    return reply.code(201).send({ goal: serializeGoal(goal) });
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const parsed = updateGoalInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { id } = fromGid(req.params.id);
    const goal = await goalsRepo.updateGoal(id, parsed.data, req.userId, req.workspaceId);
    if (!goal) return reply.code(404).send({ error: "Goal not found" });
    if (goal.topicId) await learningRepo.touchTopic(goal.topicId, req.userId, req.workspaceId);
    return { goal: serializeGoal(goal) };
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { id } = fromGid(req.params.id);
    const goal = await goalsRepo.deleteGoal(id, req.userId, req.workspaceId);
    if (!goal) return reply.code(404).send({ error: "Goal not found" });
    return { goal: serializeGoal(goal) };
  });
}
