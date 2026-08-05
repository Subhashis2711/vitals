import type { CreateCalendarEventInput, UpdateCalendarEventInput } from "@vitals/shared";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../client";
import { calendarEvents } from "../schema";

export async function listCalendarEventsByDates(dates: string[], userId: string) {
  if (dates.length === 0) return [];
  const db = getDb();
  return db
    .select()
    .from(calendarEvents)
    .where(and(inArray(calendarEvents.date, dates), eq(calendarEvents.userId, userId)));
}

export async function createCalendarEvent(input: CreateCalendarEventInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .insert(calendarEvents)
    .values({
      userId,
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      color: input.color ?? null,
      todoId: input.todoId ?? null,
    })
    .returning();
  return row;
}

export async function updateCalendarEvent(id: string, input: UpdateCalendarEventInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .update(calendarEvents)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.date !== undefined ? { date: input.date } : {}),
      ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
      ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.todoId !== undefined ? { todoId: input.todoId } : {}),
    })
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteCalendarEvent(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .delete(calendarEvents)
    .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
    .returning();
  return row ?? null;
}
