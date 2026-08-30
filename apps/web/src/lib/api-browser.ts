import { createClient } from "./supabase/client";
import { createApiClient } from "./api-core";
import { getWorkspaceIdFromDocument } from "./workspace-cookie";

// Client Components only — uses the browser Supabase client to read the
// session. Server Components/page.tsx files must import from lib/api.ts
// instead (that one needs next/headers, which can't be in this bundle).
async function getAccessToken(): Promise<string | undefined> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

async function getWorkspaceId(): Promise<string | undefined> {
  return getWorkspaceIdFromDocument();
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
