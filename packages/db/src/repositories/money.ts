import type { CreateSavingsGoalInput, CreateTransactionInput, UpdateSavingsGoalInput } from "@vitals/shared";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { savingsGoals, transactions } from "../schema";

export async function listTransactions(userId: string, workspaceId: string) {
  const db = getDb();
  return db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.workspaceId, workspaceId)))
    .orderBy(desc(transactions.occurredAt));
}

export async function createTransaction(input: CreateTransactionInput, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .insert(transactions)
    .values({
      userId,
      workspaceId,
      description: input.description,
      amount: input.amount,
      category: input.category ?? null,
      occurredAt: input.occurredAt,
    })
    .returning();
  return row;
}

export async function deleteTransaction(id: string, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId), eq(transactions.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function listSavingsGoals(userId: string, workspaceId: string) {
  const db = getDb();
  return db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.workspaceId, workspaceId)))
    .orderBy(desc(savingsGoals.createdAt));
}

export async function createSavingsGoal(input: CreateSavingsGoalInput, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .insert(savingsGoals)
    .values({
      userId,
      workspaceId,
      name: input.name,
      targetAmount: input.targetAmount,
      currentAmount: input.currentAmount ?? 0,
    })
    .returning();
  return row;
}

export async function updateSavingsGoal(id: string, input: UpdateSavingsGoalInput, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .update(savingsGoals)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.targetAmount !== undefined ? { targetAmount: input.targetAmount } : {}),
      ...(input.currentAmount !== undefined ? { currentAmount: input.currentAmount } : {}),
    })
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId), eq(savingsGoals.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}

export async function deleteSavingsGoal(id: string, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .delete(savingsGoals)
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId), eq(savingsGoals.workspaceId, workspaceId)))
    .returning();
  return row ?? null;
}
