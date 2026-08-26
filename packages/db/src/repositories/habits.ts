import type { CreateHabitInput } from "@vitals/shared";
import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "../client";
import { habitLogs, habits } from "../schema";

// Habits are tracked per calendar day in the user's local timezone, not UTC —
// "en-CA" formats as YYYY-MM-DD, which is exactly what habitLogs.date stores.
function todayDate(): string {
  return new Date().toLocaleDateString("en-CA");
}

export async function listHabits(userId: string) {
  const db = getDb();
  return db.select().from(habits).where(eq(habits.userId, userId)).orderBy(desc(habits.createdAt));
}

export async function getHabitById(id: string, userId: string) {
  const db = getDb();
  const [row] = await db.select().from(habits).where(and(eq(habits.id, id), eq(habits.userId, userId)));
  return row ?? null;
}

export async function createHabit(input: CreateHabitInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .insert(habits)
    .values({
      userId,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      frequency: input.frequency ?? "daily",
      daysOfWeek: input.daysOfWeek ?? null,
    })
    .returning();
  return row;
}

export async function deleteHabit(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .delete(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .returning();
  return row ?? null;
}

export async function listHabitLogsSince(sinceDate: string, userId: string) {
  const db = getDb();
  return db
    .select()
    .from(habitLogs)
    .where(and(gte(habitLogs.date, sinceDate), eq(habitLogs.userId, userId)));
}

export async function toggleHabitLog(habitId: string, userId: string, date?: string) {
  const db = getDb();
  const targetDate = date ?? todayDate();

  const [existing] = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, targetDate), eq(habitLogs.userId, userId)));

  if (existing) {
    await db.delete(habitLogs).where(eq(habitLogs.id, existing.id));
    return { logged: false as const, log: null };
  }

  const [row] = await db.insert(habitLogs).values({ userId, habitId, date: targetDate }).returning();
  return { logged: true as const, log: row };
}
