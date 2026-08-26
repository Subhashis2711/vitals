import { moneyRepo } from "@vitals/db";
import {
  createSavingsGoalInputSchema,
  createTransactionInputSchema,
  updateSavingsGoalInputSchema,
} from "@vitals/shared";
import type { FastifyInstance } from "fastify";

export async function moneyRoutes(app: FastifyInstance) {
  app.get("/transactions", async (req) => {
    const transactions = await moneyRepo.listTransactions(req.userId, req.workspaceId);
    return { transactions };
  });

  app.post("/transactions", async (req, reply) => {
    const parsed = createTransactionInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const transaction = await moneyRepo.createTransaction(parsed.data, req.userId, req.workspaceId);
    return reply.code(201).send({ transaction });
  });

  app.delete<{ Params: { id: string } }>("/transactions/:id", async (req, reply) => {
    const transaction = await moneyRepo.deleteTransaction(req.params.id, req.userId, req.workspaceId);
    if (!transaction) return reply.code(404).send({ error: "Transaction not found" });
    return { transaction };
  });

  app.get("/savings-goals", async (req) => {
    const savingsGoals = await moneyRepo.listSavingsGoals(req.userId, req.workspaceId);
    return { savingsGoals };
  });

  app.post("/savings-goals", async (req, reply) => {
    const parsed = createSavingsGoalInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const savingsGoal = await moneyRepo.createSavingsGoal(parsed.data, req.userId, req.workspaceId);
    return reply.code(201).send({ savingsGoal });
  });

  app.patch<{ Params: { id: string } }>("/savings-goals/:id", async (req, reply) => {
    const parsed = updateSavingsGoalInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const savingsGoal = await moneyRepo.updateSavingsGoal(req.params.id, parsed.data, req.userId, req.workspaceId);
    if (!savingsGoal) return reply.code(404).send({ error: "Savings goal not found" });
    return { savingsGoal };
  });

  app.delete<{ Params: { id: string } }>("/savings-goals/:id", async (req, reply) => {
    const savingsGoal = await moneyRepo.deleteSavingsGoal(req.params.id, req.userId, req.workspaceId);
    if (!savingsGoal) return reply.code(404).send({ error: "Savings goal not found" });
    return { savingsGoal };
  });
}
