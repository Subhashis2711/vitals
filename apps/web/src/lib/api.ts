import { cookies } from "next/headers";
import { WORKSPACE_ID_COOKIE } from "./workspace-cookie";
import { createClient } from "./supabase/server";
import { createApiClient } from "./api-core";

// Server Components / Route Handlers only — this statically imports
// next/headers (via lib/supabase/server.ts), which Next.js forbids in any
// bundle reachable from a Client Component. Client Components must import
// from lib/api-browser.ts instead.
async function getAccessToken(): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

async function getWorkspaceId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(WORKSPACE_ID_COOKIE)?.value;
}

const api = createApiClient(getAccessToken, getWorkspaceId);

export const {
  getWorkspaces,
  createWorkspace,
  deleteWorkspace,
  getTodos,
  getTodosBySourceNote,
  getTodosByProject,
  createTodo,
  updateTodo,
  deleteTodo,
  reorderTodos,
  getNotes,
  getNotesByDomain,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  captureNote,
  markdownToText,
  markdownFromText,
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitLogs,
  toggleHabitLog,
  getGoals,
  getGoalsByProject,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getLearningTopics,
  getLearningTopicDetail,
  createLearningTopic,
  updateLearningTopic,
  deleteLearningTopic,
  addLearningResource,
  deleteLearningResource,
  getJournalEntries,
  getJournalEntryByDate,
  upsertJournalEntry,
  deleteJournalEntry,
  getHealthDailyLogs,
  upsertHealthDailyLog,
  getHealthActivityLogs,
  createHealthActivityLog,
  deleteHealthActivityLog,
  getTransactions,
  createTransaction,
  deleteTransaction,
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  getPomodoroSessions,
  getPomodoroSessionsByTodo,
  createPomodoroSession,
  deletePomodoroSession,
} = api;
