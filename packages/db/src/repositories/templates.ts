import type { TemplateType } from "@vitals/shared";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { templates } from "../schema";

export interface CreateTemplateInput {
  name: string;
  type: TemplateType;
  promptUsed: string;
  fields?: Record<string, unknown>;
}

export async function listTemplates(userId: string, workspaceId: string) {
  const db = getDb();
  return db
    .select()
    .from(templates)
    .where(and(eq(templates.userId, userId), eq(templates.workspaceId, workspaceId)))
    .orderBy(desc(templates.createdAt));
}

export async function getTemplateById(id: string, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, id), eq(templates.userId, userId), eq(templates.workspaceId, workspaceId)));
  return row ?? null;
}

export async function createTemplate(input: CreateTemplateInput, userId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .insert(templates)
    .values({
      userId,
      workspaceId,
      name: input.name,
      type: input.type,
      promptUsed: input.promptUsed,
      fields: input.fields ?? {},
    })
    .returning();
  return row;
}
