import { closeDb } from "./client";
import * as notesRepo from "./repositories/notes";
import * as templatesRepo from "./repositories/templates";
import * as todosRepo from "./repositories/todos";
import * as workspacesRepo from "./repositories/workspaces";

// Seeding now writes rows owned by a real person, so it needs their actual
// Supabase auth.users id (every table FKs to auth.users — see schema.ts) —
// sign in once through the app, grab your user id from Supabase's Auth
// dashboard, then: SEED_USER_ID=<uuid> npm run db:seed
function requireSeedUserId(): string {
  const userId = process.env.SEED_USER_ID;
  if (!userId) {
    throw new Error("SEED_USER_ID is required (a real auth.users id — sign in once, then copy it from Supabase)");
  }
  return userId;
}
const userId = requireSeedUserId();

async function main() {
  const workspace = await workspacesRepo.getOrCreateDefaultWorkspace(userId);

  const note = await notesRepo.createNote({
    title: "Why local-first apps matter",
    content:
      "Local-first software keeps your data on your own device and syncs when it can, instead of treating the network as the source of truth. That means the app stays fast and usable offline.",
    rawContent:
      "local-first software keeps your data on your own device and syncs when it can instead of treating the network as the source of truth. app stays fast and usable offline.",
    contentType: "article",
    sourceUrl: "https://www.inkandswitch.com/local-first/",
    aiSummary: "Local-first apps prioritize on-device data and offline speed over network round-trips.",
    tags: ["architecture", "offline"],
  }, userId, workspace.id);

  await todosRepo.createTodo({
    title: "Read the full local-first essay",
    description: "Follow up on the ideas captured in the seeded note.",
    status: "todo",
    source: "ai_extracted",
    sourceNoteId: note.id,
    tags: ["reading"],
  }, userId, workspace.id);

  await todosRepo.createTodo({
    title: "Set up nightly database backups",
    description: "Confirm Supabase's automatic backup schedule covers this project.",
    status: "in_progress",
    source: "manual",
    tags: ["infra"],
  }, userId, workspace.id);

  await templatesRepo.createTemplate({
    name: "Meeting notes",
    type: "note",
    promptUsed: "Generate a template for capturing structured meeting notes with attendees, decisions, and action items.",
    fields: {
      attendees: { type: "string[]" },
      decisions: { type: "string[]" },
      actionItems: { type: "string[]" },
    },
  }, userId, workspace.id);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
