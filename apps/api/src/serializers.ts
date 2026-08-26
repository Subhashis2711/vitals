// Central place for GID-encoding API responses. Repositories (packages/db)
// work with plain uuids throughout — encoding only happens here, right
// before a route sends a response. See packages/shared/src/gid.ts.
import { goalsRepo, journalRepo, learningRepo, notesRepo, pomodoroRepo, projectsRepo, todosRepo } from "@vitals/db";
import { toGid } from "@vitals/shared";

type ProjectRow = NonNullable<Awaited<ReturnType<typeof projectsRepo.getProjectById>>>;
type TodoRow = NonNullable<Awaited<ReturnType<typeof todosRepo.getTodoById>>>;
type NoteRow = NonNullable<Awaited<ReturnType<typeof notesRepo.getNoteById>>>;
// deleteGoal's return type (no computed progress fields) is the narrower of
// the two shapes goalsRepo hands back — using it here means both the
// progress-carrying rows (list/get/create/update) and the plain row from
// delete are assignable.
type GoalRow = NonNullable<Awaited<ReturnType<typeof goalsRepo.deleteGoal>>>;
type TopicRow = Awaited<ReturnType<typeof learningRepo.listTopics>>[number];
type ResourceRow = NonNullable<Awaited<ReturnType<typeof learningRepo.addResource>>>;
type JournalEntryRow = NonNullable<Awaited<ReturnType<typeof journalRepo.getJournalEntryByDate>>>;
type PomodoroSessionRow = Awaited<ReturnType<typeof pomodoroRepo.listPomodoroSessions>>[number];

export function serializeProject(row: ProjectRow) {
  return { ...row, id: toGid("project", row.id) };
}

export function serializeTodo(row: TodoRow) {
  return {
    ...row,
    id: toGid("todo", row.id),
    sourceNoteId: row.sourceNoteId ? toGid("note", row.sourceNoteId) : null,
    projectId: row.projectId ? toGid("project", row.projectId) : null,
    goalId: row.goalId ? toGid("goal", row.goalId) : null,
  };
}

export function serializeNote(row: NoteRow) {
  const domainType = row.domain === "journal" ? null : row.domain;
  return {
    ...row,
    id: toGid("note", row.id),
    domainId: row.domainId && domainType ? toGid(domainType, row.domainId) : null,
  };
}

export function serializeGoal(row: GoalRow) {
  return {
    ...row,
    id: toGid("goal", row.id),
    projectId: row.projectId ? toGid("project", row.projectId) : null,
    topicId: row.topicId ? toGid("learning", row.topicId) : null,
  };
}

export function serializeTopic(row: TopicRow) {
  return { ...row, id: toGid("learning", row.id) };
}

export function serializeResource(row: ResourceRow) {
  return { ...row, id: toGid("resource", row.id), topicId: toGid("learning", row.topicId) };
}

export function serializeJournalEntry(row: JournalEntryRow) {
  return { ...row, id: toGid("journal", row.id), noteId: toGid("note", row.noteId) };
}

export function serializePomodoroSession(row: PomodoroSessionRow) {
  return { ...row, id: toGid("pomodoro", row.id), todoId: row.todoId ? toGid("todo", row.todoId) : null };
}
