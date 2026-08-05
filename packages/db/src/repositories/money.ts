import type { CreateSavingsGoalInput, CreateTransactionInput, UpdateSavingsGoalInput } from "@vitals/shared";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { savingsGoals, transactions } from "../schema";

export async function listTransactions(userId: string) {
  const db = getDb();
  return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.occurredAt));
}

export async function createTransaction(input: CreateTransactionInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .insert(transactions)
    .values({
      userId,
      description: input.description,
      amount: input.amount,
      category: input.category ?? null,
      occurredAt: input.occurredAt,
    })
    .returning();
  return row;
}

export async function deleteTransaction(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();
  return row ?? null;
}

export async function listSavingsGoals(userId: string) {
  const db = getDb();
  return db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId)).orderBy(desc(savingsGoals.createdAt));
}

export async function createSavingsGoal(input: CreateSavingsGoalInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .insert(savingsGoals)
    .values({
      userId,
      name: input.name,
      targetAmount: input.targetAmount,
      currentAmount: input.currentAmount ?? 0,
    })
    .returning();
  return row;
}

export async function updateSavingsGoal(id: string, input: UpdateSavingsGoalInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .update(savingsGoals)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.targetAmount !== undefined ? { targetAmount: input.targetAmount } : {}),
      ...(input.currentAmount !== undefined ? { currentAmount: input.currentAmount } : {}),
    })
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteSavingsGoal(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .delete(savingsGoals)
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
    .returning();
  return row ?? null;
}
