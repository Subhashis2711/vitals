import { z } from "zod";

// Shopify-style global IDs: `brain/<type>/<uuid>`. The DB primary key stays a
// plain uuid (see packages/db/src/schema.ts) — encoding only happens at the
// API boundary (route handlers), on the way out to and in from the frontend.
export const RESOURCE_TYPES = [
  "project",
  "goal",
  "todo",
  "note",
  "journal",
  "learning",
  "resource",
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

const GID_PREFIX = "brain";

export function toGid(type: ResourceType, id: string): string {
  return `${GID_PREFIX}/${type}/${id}`;
}

export function fromGid(gid: string): { type: ResourceType; id: string } {
  const parts = gid.split("/");
  const [prefix, type, id] = parts;
  if (parts.length !== 3 || prefix !== GID_PREFIX || !RESOURCE_TYPES.includes(type as ResourceType) || !id) {
    throw new Error(`Invalid GID: ${gid}`);
  }
  return { type: type as ResourceType, id };
}

// Validates a GID string is well-formed and of the expected resource type,
// then transforms it down to the raw uuid — used in place of z.string().uuid()
// on id/FK input fields so repositories keep working with plain uuids.
export function gidSchema(type: ResourceType) {
  return z.string().transform((val, ctx) => {
    let parsed: { type: ResourceType; id: string };
    try {
      parsed = fromGid(val);
    } catch {
      ctx.addIssue({ code: "custom", message: `Expected a "${type}" GID, got "${val}"` });
      return z.NEVER;
    }
    if (parsed.type !== type) {
      ctx.addIssue({ code: "custom", message: `Expected a "${type}" GID, got a "${parsed.type}" GID` });
      return z.NEVER;
    }
    return parsed.id;
  });
}
