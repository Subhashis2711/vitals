import type { CreateHealthActivityLogInput, UpsertHealthDailyLogInput } from "@vitals/shared";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../client";
import { healthActivityLogs, healthDailyLogs } from "../schema";

export async function listDailyLogsSince(sinceDate: string, userId: string) {
  const db = getDb();
  return db
    .select()
    .from(healthDailyLogs)
    .where(and(gte(healthDailyLogs.date, sinceDate), eq(healthDailyLogs.userId, userId)))
    .orderBy(desc(healthDailyLogs.date));
}

export async function getDailyLogByDate(date: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(healthDailyLogs)
    .where(and(eq(healthDailyLogs.date, date), eq(healthDailyLogs.userId, userId)));
  return row ?? null;
}

export async function upsertDailyLog(input: UpsertHealthDailyLogInput, userId: string) {
  const db = getDb();
  const existing = await getDailyLogByDate(input.date, userId);
  const patch = {
    ...(input.steps !== undefined ? { steps: input.steps } : {}),
    ...(input.sleepHours !== undefined ? { sleepHours: input.sleepHours } : {}),
    ...(input.weightKg !== undefined ? { weightKg: input.weightKg } : {}),
    ...(input.waterCups !== undefined ? { waterCups: input.waterCups } : {}),
  };
  if (existing) {
    const [row] = await db
      .update(healthDailyLogs)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(healthDailyLogs.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(healthDailyLogs)
    .values({ userId, date: input.date, waterCups: input.waterCups ?? 0, ...patch })
    .returning();
  return row;
}

export async function listActivityLogsSince(sinceDate: string, userId: string) {
  const db = getDb();
  return db
    .select()
    .from(healthActivityLogs)
    .where(and(gte(healthActivityLogs.date, sinceDate), eq(healthActivityLogs.userId, userId)))
    .orderBy(desc(healthActivityLogs.date));
}

export async function createActivityLog(input: CreateHealthActivityLogInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .insert(healthActivityLogs)
    .values({ userId, date: input.date, sport: input.sport, durationMin: input.durationMin })
    .returning();
  return row;
}

export async function deleteActivityLog(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .delete(healthActivityLogs)
    .where(and(eq(healthActivityLogs.id, id), eq(healthActivityLogs.userId, userId)))
    .returning();
  return row ?? null;
}
