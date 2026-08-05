import type { CreateLearningResourceInput, CreateLearningTopicInput } from "@vitals/shared";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { learningResources, learningTopics } from "../schema";
import { deleteNotesByDomain, listNotesByDomain } from "./notes";
import { listGoalsByTopicId } from "./goals";

export async function listTopics(userId: string) {
  const db = getDb();
  return db.select().from(learningTopics).where(eq(learningTopics.userId, userId)).orderBy(desc(learningTopics.lastTouchedAt));
}

// Roadmap items and insights aren't their own tables anymore — roadmap is
// goals scoped by topicId, insights are notes scoped by domain "learning" +
// domainId: topicId. See schema.ts and repositories/goals.ts / notes.ts.
export async function getTopicDetail(topicId: string, userId: string) {
  const db = getDb();
  const [topic] = await db
    .select()
    .from(learningTopics)
    .where(and(eq(learningTopics.id, topicId), eq(learningTopics.userId, userId)));
  if (!topic) return null;
  const [roadmap, resources, insights] = await Promise.all([
    listGoalsByTopicId(topicId, userId),
    db
      .select()
      .from(learningResources)
      .where(and(eq(learningResources.topicId, topicId), eq(learningResources.userId, userId)))
      .orderBy(desc(learningResources.createdAt)),
    listNotesByDomain("learning", userId, topicId),
  ]);
  return { topic, roadmap, resources, insights };
}

export async function createTopic(input: CreateLearningTopicInput, userId: string) {
  const db = getDb();
  const [row] = await db.insert(learningTopics).values({ userId, title: input.title }).returning();
  return row;
}

// domainId has no DB-level FK (see schema.ts comment on notes), so deleting
// a topic must explicitly clean up notes pointing at it via domainId. Goals
// scoped to this topic are handled by the real FK (onDelete: "set null").
export async function deleteTopic(id: string, userId: string) {
  const db = getDb();
  await deleteNotesByDomain("learning", id, userId);
  const [row] = await db
    .delete(learningTopics)
    .where(and(eq(learningTopics.id, id), eq(learningTopics.userId, userId)))
    .returning();
  return row ?? null;
}

// Exported so routes/goals.ts and routes/notes.ts can bump "last touched"
// when a roadmap goal or learning-domain note is added — those live in their
// own repositories now, not this one.
export async function touchTopic(topicId: string, userId: string) {
  const db = getDb();
  await db
    .update(learningTopics)
    .set({ lastTouchedAt: new Date() })
    .where(and(eq(learningTopics.id, topicId), eq(learningTopics.userId, userId)));
}

export async function addResource(topicId: string, input: CreateLearningResourceInput, userId: string) {
  const db = getDb();
  const [row] = await db
    .insert(learningResources)
    .values({ userId, topicId, name: input.name, url: input.url ?? null })
    .returning();
  await touchTopic(topicId, userId);
  return row;
}

export async function deleteResource(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .delete(learningResources)
    .where(and(eq(learningResources.id, id), eq(learningResources.userId, userId)))
    .returning();
  return row ?? null;
}
