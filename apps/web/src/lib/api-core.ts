import type {
  CalendarEvent,
  CaptureNoteRequest,
  CaptureNoteResponse,
  CreateCalendarEventInput,
  CreateGoalInput,
  CreateHabitInput,
  CreateHealthActivityLogInput,
  CreateLearningResourceInput,
  CreateLearningTopicInput,
  CreateNoteInput,
  CreateProjectInput,
  CreateSavingsGoalInput,
  CreateTodoInput,
  CreateTransactionInput,
  CreateWorkspaceInput,
  Goal,
  Habit,
  HabitLog,
  HealthActivityLog,
  HealthDailyLog,
  JournalEntry,
  LearningResource,
  LearningTopic,
  LearningTopicDetail,
  MarkdownFromTextResponse,
  MarkdownToTextResponse,
  CreatePomodoroSessionInput,
  Note,
  NoteDomain,
  PomodoroSession,
  Project,
  SavingsGoal,
  Todo,
  ToggleHabitLogResponse,
  Transaction,
  UpdateCalendarEventInput,
  UpdateGoalInput,
  UpdateNoteInput,
  UpdateProjectInput,
  UpdateSavingsGoalInput,
  UpdateTodoInput,
  UpsertHealthDailyLogInput,
  UpsertJournalEntryInput,
  Workspace,
} from "@vitals/shared";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// The actual token-fetching mechanism differs between Server Components
// (next/headers — forbidden in client bundles) and Client Components (the
// browser Supabase client), and a dynamic import gated on `typeof window`
// does NOT keep next/headers out of the client bundle — Next still traces
// it statically and throws. So instead this factory takes the token getter
// (and, likewise, the workspace-id getter) as a parameter; lib/api.ts and
// lib/api-browser.ts each bind their own, and every page/component imports
// from whichever of those two matches where it runs.
export function createApiClient(
  getAccessToken: () => Promise<string | undefined>,
  getWorkspaceId: () => Promise<string | undefined>,
) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const [token, workspaceId] = await Promise.all([getAccessToken(), getWorkspaceId()]);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        // Fastify's default JSON body parser rejects a declared JSON
        // content-type on a request with no body (FST_ERR_CTP_EMPTY_JSON_BODY)
        // — only send it when there's actually a body to parse (DELETE calls
        // and bodyless GETs must not set it).
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API ${path} failed (${res.status}): ${body}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    // --- Workspaces ---
    // No X-Workspace-Id concept applies to these two — see
    // apps/api/src/routes/workspaces.ts.

    getWorkspaces() {
      return request<{ workspaces: Workspace[] }>("/workspaces");
    },

    createWorkspace(input: CreateWorkspaceInput) {
      return request<{ workspace: Workspace }>("/workspaces", { method: "POST", body: JSON.stringify(input) });
    },

    deleteWorkspace(id: string) {
      return request<{ workspace: Workspace }>(`/workspaces/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    getTodos() {
      return request<{ todos: Todo[] }>("/todos");
    },

    getTodosBySourceNote(noteId: string) {
      return request<{ todos: Todo[] }>(`/todos?sourceNoteId=${encodeURIComponent(noteId)}`);
    },

    getTodosByProject(projectId: string) {
      return request<{ todos: Todo[] }>(`/todos?projectId=${encodeURIComponent(projectId)}`);
    },

    createTodo(input: CreateTodoInput) {
      return request<{ todo: Todo }>("/todos", { method: "POST", body: JSON.stringify(input) });
    },

    // nextTodo is set when completing a recurring todo spawns its next
    // occurrence as a new row — see packages/db/src/repositories/todos.ts.
    updateTodo(id: string, input: UpdateTodoInput) {
      return request<{ todo: Todo; nextTodo: Todo | null }>(`/todos/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    deleteTodo(id: string) {
      return request<{ todo: Todo }>(`/todos/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    reorderTodos(firstId: string, secondId: string) {
      return request<{ todos: Todo[] }>("/todos/reorder", {
        method: "POST",
        body: JSON.stringify({ firstId, secondId }),
      });
    },

    getNotes() {
      return request<{ notes: Note[] }>("/notes");
    },

    getNotesByDomain(domain: NoteDomain, domainId?: string) {
      const qs = domainId ? `?domain=${domain}&domainId=${encodeURIComponent(domainId)}` : `?domain=${domain}`;
      return request<{ notes: Note[] }>(`/notes${qs}`);
    },

    getNote(id: string) {
      return request<{ note: Note }>(`/notes/${encodeURIComponent(id)}`);
    },

    createNote(input: CreateNoteInput) {
      return request<{ note: Note }>("/notes", { method: "POST", body: JSON.stringify(input) });
    },

    updateNote(id: string, input: UpdateNoteInput) {
      return request<{ note: Note }>(`/notes/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    deleteNote(id: string) {
      return request<{ note: Note }>(`/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    captureNote(input: CaptureNoteRequest) {
      return request<CaptureNoteResponse>("/notes/capture", { method: "POST", body: JSON.stringify(input) });
    },

    markdownToText(markdown: string) {
      return request<MarkdownToTextResponse>("/markdown/to-text", {
        method: "POST",
        body: JSON.stringify({ markdown }),
      });
    },

    markdownFromText(text: string) {
      return request<MarkdownFromTextResponse>("/markdown/from-text", { method: "POST", body: JSON.stringify({ text }) });
    },

    getProjects() {
      return request<{ projects: Project[] }>("/projects");
    },

    getProject(id: string) {
      return request<{ project: Project }>(`/projects/${encodeURIComponent(id)}`);
    },

    createProject(input: CreateProjectInput) {
      return request<{ project: Project }>("/projects", { method: "POST", body: JSON.stringify(input) });
    },

    updateProject(id: string, input: UpdateProjectInput) {
      return request<{ project: Project }>(`/projects/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    deleteProject(id: string) {
      return request<{ project: Project }>(`/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    getHabits() {
      return request<{ habits: Habit[] }>("/habits");
    },

    createHabit(input: CreateHabitInput) {
      return request<{ habit: Habit }>("/habits", { method: "POST", body: JSON.stringify(input) });
    },

    deleteHabit(id: string) {
      return request<{ habit: Habit }>(`/habits/${id}`, { method: "DELETE" });
    },

    getHabitLogs(since?: string) {
      const qs = since ? `?since=${encodeURIComponent(since)}` : "";
      return request<{ logs: HabitLog[] }>(`/habits/logs${qs}`);
    },

    toggleHabitLog(habitId: string, date?: string) {
      return request<ToggleHabitLogResponse>(`/habits/${habitId}/toggle`, {
        method: "POST",
        body: JSON.stringify(date ? { date } : {}),
      });
    },

    // --- Goals ---

    getGoals() {
      return request<{ goals: Goal[] }>("/goals");
    },

    getGoalsByProject(projectId: string) {
      return request<{ goals: Goal[] }>(`/goals?projectId=${encodeURIComponent(projectId)}`);
    },

    getGoal(id: string) {
      return request<{ goal: Goal; todos: Todo[] }>(`/goals/${encodeURIComponent(id)}`);
    },

    createGoal(input: CreateGoalInput) {
      return request<{ goal: Goal }>("/goals", { method: "POST", body: JSON.stringify(input) });
    },

    updateGoal(id: string, input: UpdateGoalInput) {
      return request<{ goal: Goal }>(`/goals/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    deleteGoal(id: string) {
      return request<{ goal: Goal }>(`/goals/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    // --- Calendar ---

    getCalendarEvents(dates: string[]) {
      return request<{ events: CalendarEvent[] }>(`/calendar?dates=${dates.map(encodeURIComponent).join(",")}`);
    },

    createCalendarEvent(input: CreateCalendarEventInput) {
      return request<{ event: CalendarEvent }>("/calendar", { method: "POST", body: JSON.stringify(input) });
    },

    updateCalendarEvent(id: string, input: UpdateCalendarEventInput) {
      return request<{ event: CalendarEvent }>(`/calendar/${id}`, { method: "PATCH", body: JSON.stringify(input) });
    },

    deleteCalendarEvent(id: string) {
      return request<{ event: CalendarEvent }>(`/calendar/${id}`, { method: "DELETE" });
    },

    // --- Learning ---

    getLearningTopics() {
      return request<{ topics: LearningTopic[] }>("/learning/topics");
    },

    getLearningTopicDetail(id: string) {
      return request<LearningTopicDetail>(`/learning/topics/${encodeURIComponent(id)}`);
    },

    createLearningTopic(input: CreateLearningTopicInput) {
      return request<{ topic: LearningTopic }>("/learning/topics", { method: "POST", body: JSON.stringify(input) });
    },

    deleteLearningTopic(id: string) {
      return request<{ topic: LearningTopic }>(`/learning/topics/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    // Roadmap steps are goals scoped to a topic (createGoal({ topicId })), and
    // insights are notes scoped to a topic (createNote({ domain: "learning",
    // domainId: topicId })) — see getGoal/createGoal/updateGoal/deleteGoal and
    // createNote/deleteNote above.

    addLearningResource(topicId: string, input: CreateLearningResourceInput) {
      return request<{ resource: LearningResource }>(`/learning/topics/${encodeURIComponent(topicId)}/resources`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    deleteLearningResource(id: string) {
      return request<{ resource: LearningResource }>(`/learning/resources/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },

    // --- Journal ---

    getJournalEntries() {
      return request<{ entries: JournalEntry[] }>("/journal");
    },

    getJournalEntryByDate(date: string) {
      return request<{ entry: JournalEntry | null }>(`/journal/by-date?date=${encodeURIComponent(date)}`);
    },

    upsertJournalEntry(input: UpsertJournalEntryInput) {
      return request<{ entry: JournalEntry }>("/journal", { method: "POST", body: JSON.stringify(input) });
    },

    deleteJournalEntry(id: string) {
      return request<{ entry: JournalEntry }>(`/journal/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    // --- Health ---

    getHealthDailyLogs(since?: string) {
      const qs = since ? `?since=${encodeURIComponent(since)}` : "";
      return request<{ logs: HealthDailyLog[] }>(`/wellness/daily${qs}`);
    },

    upsertHealthDailyLog(input: UpsertHealthDailyLogInput) {
      return request<{ log: HealthDailyLog }>("/wellness/daily", { method: "POST", body: JSON.stringify(input) });
    },

    getHealthActivityLogs(since?: string) {
      const qs = since ? `?since=${encodeURIComponent(since)}` : "";
      return request<{ logs: HealthActivityLog[] }>(`/wellness/activity${qs}`);
    },

    createHealthActivityLog(input: CreateHealthActivityLogInput) {
      return request<{ log: HealthActivityLog }>("/wellness/activity", { method: "POST", body: JSON.stringify(input) });
    },

    deleteHealthActivityLog(id: string) {
      return request<{ log: HealthActivityLog }>(`/wellness/activity/${id}`, { method: "DELETE" });
    },

    // --- Money ---

    getTransactions() {
      return request<{ transactions: Transaction[] }>("/money/transactions");
    },

    createTransaction(input: CreateTransactionInput) {
      return request<{ transaction: Transaction }>("/money/transactions", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    deleteTransaction(id: string) {
      return request<{ transaction: Transaction }>(`/money/transactions/${id}`, { method: "DELETE" });
    },

    getSavingsGoals() {
      return request<{ savingsGoals: SavingsGoal[] }>("/money/savings-goals");
    },

    createSavingsGoal(input: CreateSavingsGoalInput) {
      return request<{ savingsGoal: SavingsGoal }>("/money/savings-goals", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },

    updateSavingsGoal(id: string, input: UpdateSavingsGoalInput) {
      return request<{ savingsGoal: SavingsGoal }>(`/money/savings-goals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },

    deleteSavingsGoal(id: string) {
      return request<{ savingsGoal: SavingsGoal }>(`/money/savings-goals/${id}`, { method: "DELETE" });
    },

    // --- Pomodoro ---

    getPomodoroSessions(since?: string) {
      const qs = since ? `?since=${encodeURIComponent(since)}` : "";
      return request<{ sessions: PomodoroSession[] }>(`/pomodoro${qs}`);
    },

    getPomodoroSessionsByTodo(todoId: string) {
      return request<{ sessions: PomodoroSession[] }>(`/pomodoro?todoId=${encodeURIComponent(todoId)}`);
    },

    createPomodoroSession(input: CreatePomodoroSessionInput) {
      return request<{ session: PomodoroSession }>("/pomodoro", { method: "POST", body: JSON.stringify(input) });
    },

    deletePomodoroSession(id: string) {
      return request<{ session: PomodoroSession }>(`/pomodoro/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  };
}
