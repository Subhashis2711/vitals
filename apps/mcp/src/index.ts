import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { calendarRepo, closeDb, goalsRepo, habitsRepo, notesRepo, projectsRepo, todosRepo, workspacesRepo } from "@vitals/db";
import { z } from "zod";

const identifier = z.string().trim().min(1).max(200).describe("UUID or human-readable key/reference");

type Context = { userId: string; workspaceId: string; workspaceName: string };

function result(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function loadContext(): Promise<Context> {
  const userId = process.env.MCP_USER_ID;
  const workspaceId = process.env.MCP_WORKSPACE_ID;
  if (!userId || !workspaceId) {
    throw new Error("MCP_USER_ID and MCP_WORKSPACE_ID must be set before starting the Vitals MCP server.");
  }

  const workspace = await workspacesRepo.getWorkspaceById(workspaceId, userId);
  if (!workspace) throw new Error("MCP_WORKSPACE_ID does not belong to MCP_USER_ID.");
  return { userId, workspaceId: workspace.id, workspaceName: workspace.name };
}

async function resolveId(context: Context, kind: "project" | "goal" | "task" | "note", value: string): Promise<string> {
  const repo = { project: projectsRepo, goal: goalsRepo, task: todosRepo, note: notesRepo };
  const uuid = z.string().uuid().safeParse(value).success;
  const row = kind === "project"
    ? await (uuid ? repo.project.getProjectById : repo.project.getProjectByKey)(value, context.userId, context.workspaceId)
    : kind === "goal"
      ? await (uuid ? repo.goal.getGoalById : repo.goal.getGoalByReference)(value, context.userId, context.workspaceId)
      : kind === "task"
        ? await (uuid ? repo.task.getTodoById : repo.task.getTodoByReference)(value, context.userId, context.workspaceId)
        : await (uuid ? repo.note.getNoteById : repo.note.getNoteByReference)(value, context.userId, context.workspaceId);
  if (!row) throw new Error(`${kind} not found in the configured workspace.`);
  return row.id;
}

async function validateLinks(context: Context, links: { projectId?: string | null; goalId?: string | null }) {
  if (links.projectId) {
    const project = await projectsRepo.getProjectById(links.projectId, context.userId, context.workspaceId);
    if (!project) throw new Error("Project not found in the configured workspace.");
  }
  if (links.goalId) {
    const goal = await goalsRepo.getGoalById(links.goalId, context.userId, context.workspaceId);
    if (!goal) throw new Error("Goal not found in the configured workspace.");
  }
}

async function getIdea(context: Context, id: string) {
  const note = await notesRepo.getNoteById(id, context.userId, context.workspaceId);
  if (!note || note.contentType !== "idea") throw new Error("Idea not found in the configured workspace.");
  return note;
}

async function promoteIdea(context: Context, id: string) {
  const idea = await getIdea(context, id);
  if (!idea.tags.includes("promoted")) {
    await notesRepo.updateNote(
      id,
      { tags: [...idea.tags.filter((tag) => tag !== "inbox"), "promoted"] },
      context.userId,
      context.workspaceId,
    );
  }
  return idea;
}

async function dependencyTags(context: Context, dependencyIds: string[]) {
  for (const dependencyId of dependencyIds) {
    const dependency = await todosRepo.getTodoById(dependencyId, context.userId, context.workspaceId);
    if (!dependency) throw new Error("A dependency todo was not found in the configured workspace.");
  }
  return dependencyIds.map((id) => `depends-on:${id}`);
}

async function createServer(context: Context) {
  const server = new McpServer({ name: "vitals", version: "0.1.0" });

  server.registerTool(
    "vitals_get_today",
    {
      title: "Get today's Vitals overview",
      description: "Returns open todos, calendar events, and habit progress for the configured workspace.",
      inputSchema: {},
    },
    async () => {
      const today = new Date().toLocaleDateString("en-CA");
      const [todos, events, habits, habitLogs] = await Promise.all([
        todosRepo.listTodos(context.userId, context.workspaceId),
        calendarRepo.listCalendarEventsByDates([today], context.userId, context.workspaceId),
        habitsRepo.listHabits(context.userId, context.workspaceId),
        habitsRepo.listHabitLogsSince(today, context.userId, context.workspaceId),
      ]);

      return result({
        workspace: context.workspaceName,
        date: today,
        todos: todos
          .filter((todo) => todo.status !== "done")
          .map((todo) => ({ id: todo.id, reference: todo.reference, title: todo.title, status: todo.status, dueDate: todo.dueDate ? isoDate(todo.dueDate) : null })),
        events,
        habits: habits.map((habit) => ({
          id: habit.id,
          name: habit.name,
          complete: habitLogs.some((log) => log.habitId === habit.id && log.date === today),
        })),
      });
    },
  );

  server.registerTool(
    "vitals_search_notes",
    {
      title: "Search Vitals notes",
      description: "Searches note titles, content, and tags in the configured workspace.",
      inputSchema: { query: z.string().min(1).max(200), limit: z.number().int().min(1).max(20).optional() },
    },
    async ({ query, limit = 10 }) => {

      const needle = query.toLocaleLowerCase();
      const notes = await notesRepo.listNotes(context.userId, context.workspaceId);
      const matches = notes
        .filter((note) => [note.reference, note.title, note.content, ...note.tags].some((value) => value?.toLocaleLowerCase().includes(needle)))
        .slice(0, limit)
        .map((note) => ({
          id: note.id, reference: note.reference,
          title: note.title ?? "Untitled",
          excerpt: note.content.slice(0, 500),
          tags: note.tags,
          updatedAt: note.updatedAt,
        }));
      return result({ workspace: context.workspaceName, query, matches });
    },
  );

  server.registerTool(
    "vitals_list_projects",
    {
      title: "List Vitals projects",
      description: "Lists projects in the configured workspace, including readable keys and UUIDs used to link todos and goals.",
      inputSchema: {},
    },
    async () => {
      const projects = await projectsRepo.listProjects(context.userId, context.workspaceId);
      return result({
        workspace: context.workspaceName,
        projects: projects.map((project) => ({ id: project.id, key: project.key, name: project.name, description: project.description, color: project.color })),
      });
    },
  );

  server.registerTool(
    "vitals_create_project",
    {
      title: "Create a Vitals project",
      description: "Creates a project in the configured workspace. Use only after the user has clearly requested it.",
      inputSchema: {
        name: z.string().min(1).max(200),
        description: z.string().max(5_000).optional(),
        color: z.string().max(40).optional(),
      },
    },
    async ({ name, description, color }) => {

      const project = await projectsRepo.createProject(
        { name, description: description ?? null, color: color ?? null },
        context.userId,
        context.workspaceId,
      );
      return result({ workspace: context.workspaceName, created: { id: project.id, key: project.key, name: project.name, description: project.description } });
    },
  );

  server.registerTool(
    "vitals_list_goals",
    {
      title: "List Vitals goals",
      description: "Lists goals in the configured workspace, including project links and progress.",
      inputSchema: { projectId: identifier.optional() },
    },
    async ({ projectId }) => {
      if (projectId) projectId = await resolveId(context, "project", projectId);
      if (projectId) await validateLinks(context, { projectId });
      const goals = projectId
        ? await goalsRepo.listGoalsByProjectId(projectId, context.userId, context.workspaceId)
        : await goalsRepo.listGoals(context.userId, context.workspaceId);
      return result({
        workspace: context.workspaceName,
        goals: goals.map((goal) => ({
          id: goal.id, reference: goal.reference,
          title: goal.title,
          status: goal.status,
          projectId: goal.projectId,
          progress: goal.progress,
          todoCount: goal.todoCount,
        })),
      });
    },
  );

  server.registerTool(
    "vitals_create_goal",
    {
      title: "Create a Vitals goal",
      description: "Creates a goal and optionally links it to a project in the configured workspace.",
      inputSchema: {
        title: z.string().min(1).max(500),
        description: z.string().max(5_000).optional(),
        startDate: z.string().date().optional(),
        targetDate: z.string().date().optional(),
        projectId: identifier.optional(),
      },
    },
    async ({ title, description, startDate, targetDate, projectId }) => {
      if (projectId) projectId = await resolveId(context, "project", projectId);
      await validateLinks(context, { projectId });
      const goal = await goalsRepo.createGoal(
        {
          title,
          description: description ?? null,
          startDate: startDate ?? null,
          targetDate: targetDate ?? null,
          projectId: projectId ?? null,
        },
        context.userId,
        context.workspaceId,
      );
      return result({ workspace: context.workspaceName, created: { id: goal.id, reference: goal.reference, title: goal.title, projectId: goal.projectId } });
    },
  );

  server.registerTool(
    "vitals_create_todo",
    {
      title: "Create a Vitals todo",
      description: "Creates a todo in the configured workspace. Use only after the user has clearly asked to create it.",
      inputSchema: {
        title: z.string().min(1).max(500),
        description: z.string().max(5_000).optional(),
        dueDate: z.string().date().optional(),
        tags: z.array(z.string().min(1).max(100)).max(20).optional(),
        projectId: identifier.optional(),
        goalId: identifier.optional(),
        ideaId: identifier.optional(),
        dependencyIds: z.array(identifier).max(20).optional(),
      },
    },
    async ({ title, description, dueDate, tags, projectId, goalId, ideaId, dependencyIds = [] }) => {
      if (projectId) projectId = await resolveId(context, "project", projectId);
      if (goalId) goalId = await resolveId(context, "goal", goalId);
      if (ideaId) ideaId = await resolveId(context, "note", ideaId);
      if (dependencyIds) dependencyIds = await Promise.all(dependencyIds.map((id) => resolveId(context, "task", id)));
      await validateLinks(context, { projectId, goalId });
      if (ideaId) await promoteIdea(context, ideaId);
      const dependencies = await dependencyTags(context, dependencyIds);
      const todo = await todosRepo.createTodo(
        {
          title,
          description: description ?? null,
          dueDate: dueDate ?? null,
          tags: [...(tags ?? []), ...dependencies],
          projectId: projectId ?? null,
          goalId: goalId ?? null,
          sourceNoteId: ideaId ?? null,
          source: "manual",
        },
        context.userId,
        context.workspaceId,
      );
      return result({
        workspace: context.workspaceName,
        created: {
          id: todo.id, reference: todo.reference,
          title: todo.title,
          dueDate: todo.dueDate ? isoDate(todo.dueDate) : null,
          projectId: todo.projectId,
          goalId: todo.goalId,
          ideaId: todo.sourceNoteId,
          dependencyIds,
        },
      });
    },
  );

  server.registerTool(
    "vitals_update_todo_links",
    {
      title: "Link a todo to a project or goal",
      description: "Links or unlinks an existing todo to a project and/or goal in the configured workspace. Set a link to null to remove it.",
      inputSchema: {
        id: identifier,
        projectId: identifier.nullable().optional(),
        goalId: identifier.nullable().optional(),
      },
    },
    async ({ id, projectId, goalId }) => {
      if (projectId) projectId = await resolveId(context, "project", projectId);
      if (goalId) goalId = await resolveId(context, "goal", goalId);
      id = await resolveId(context, "task", id);
      await validateLinks(context, { projectId, goalId });
      if (projectId === undefined && goalId === undefined) return result({ error: "Provide projectId and/or goalId to update." });
      const updated = await todosRepo.updateTodo(id, { projectId, goalId }, context.userId, context.workspaceId);
      if (!updated) return result({ error: "Todo not found in the configured workspace." });
      return result({
        workspace: context.workspaceName,
        todo: { id: updated.todo.id, reference: updated.todo.reference, title: updated.todo.title, projectId: updated.todo.projectId, goalId: updated.todo.goalId },
      });
    },
  );

  server.registerTool(
    "vitals_update_goal_project",
    {
      title: "Link a goal to a project",
      description: "Links or unlinks an existing goal to a project in the configured workspace. Set projectId to null to remove the link.",
      inputSchema: { id: identifier, projectId: identifier.nullable() },
    },
    async ({ id, projectId }) => {
      if (projectId) projectId = await resolveId(context, "project", projectId);
      id = await resolveId(context, "goal", id);
      await validateLinks(context, { projectId });
      const goal = await goalsRepo.updateGoal(id, { projectId }, context.userId, context.workspaceId);
      if (!goal) return result({ error: "Goal not found in the configured workspace." });
      return result({ workspace: context.workspaceName, goal: { id: goal.id, reference: goal.reference, title: goal.title, projectId: goal.projectId } });
    },
  );

  server.registerTool(
    "vitals_complete_todo",
    {
      title: "Complete a Vitals todo",
      description: "Marks a todo in the configured workspace as done. Use only after the user has clearly confirmed it.",
      inputSchema: { id: identifier },
    },
    async ({ id }) => {
      id = await resolveId(context, "task", id);
      const todo = await todosRepo.updateTodo(id, { status: "done" }, context.userId, context.workspaceId);
      if (!todo) return result({ error: "Todo not found in the configured workspace." });
      return result({ workspace: context.workspaceName, completed: { id: todo.todo.id, reference: todo.todo.reference, title: todo.todo.title } });
    },
  );

  server.registerTool(
    "vitals_list_tasks",
    {
      title: "List Vitals tasks",
      description: "Lists tasks in the configured workspace, optionally narrowed to a project or goal.",
      inputSchema: { projectId: identifier.optional(), goalId: identifier.optional(), includeDone: z.boolean().optional() },
    },
    async ({ projectId, goalId, includeDone = false }) => {
      if (projectId) projectId = await resolveId(context, "project", projectId);
      if (goalId) goalId = await resolveId(context, "goal", goalId);
      await validateLinks(context, { projectId, goalId });
      const candidateTasks = projectId
        ? await todosRepo.listTodosByProjectId(projectId, context.userId, context.workspaceId)
        : await todosRepo.listTodos(context.userId, context.workspaceId);
      const tasks = candidateTasks
        .filter((todo) => (!goalId || todo.goalId === goalId) && (includeDone || todo.status !== "done"))
        .map((todo) => ({
          id: todo.id, reference: todo.reference,
          title: todo.title,
          status: todo.status,
          dueDate: todo.dueDate ? isoDate(todo.dueDate) : null,
          projectId: todo.projectId,
          goalId: todo.goalId,
          ideaId: todo.sourceNoteId,
          dependencyIds: todo.tags.filter((tag) => tag.startsWith("depends-on:")).map((tag) => tag.slice("depends-on:".length)),
        }));
      return result({ workspace: context.workspaceName, tasks });
    },
  );

  server.registerTool(
    "vitals_update_task",
    {
      title: "Update a Vitals task",
      description: "Updates a task's details, workflow status, links, promoted idea, or dependencies. Use only after the user has clearly requested the change.",
      inputSchema: {
        id: identifier,
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(5_000).nullable().optional(),
        status: z.enum(["todo", "in_progress", "done"]).optional(),
        dueDate: z.string().date().nullable().optional(),
        tags: z.array(z.string().min(1).max(100)).max(20).optional(),
        projectId: identifier.nullable().optional(),
        goalId: identifier.nullable().optional(),
        ideaId: identifier.nullable().optional(),
        dependencyIds: z.array(identifier).max(20).optional(),
      },
    },
    async ({ id, title, description, status, dueDate, tags, projectId, goalId, ideaId, dependencyIds }) => {
      if (projectId) projectId = await resolveId(context, "project", projectId);
      if (goalId) goalId = await resolveId(context, "goal", goalId);
      if (ideaId) ideaId = await resolveId(context, "note", ideaId);
      id = await resolveId(context, "task", id);
      if (dependencyIds) dependencyIds = await Promise.all(dependencyIds.map((id) => resolveId(context, "task", id)));
      await validateLinks(context, { projectId, goalId });
      if (ideaId) await promoteIdea(context, ideaId);
      const existing = await todosRepo.getTodoById(id, context.userId, context.workspaceId);
      if (!existing) return result({ error: "Todo not found in the configured workspace." });

      const resolvedTags =
        dependencyIds === undefined
          ? tags
          : [...(tags ?? existing.tags.filter((tag) => !tag.startsWith("depends-on:"))), ...(await dependencyTags(context, dependencyIds))];
      const updated = await todosRepo.updateTodo(
        id,
        {
          title,
          description,
          status,
          dueDate,
          tags: resolvedTags,
          projectId,
          goalId,
          sourceNoteId: ideaId,
        },
        context.userId,
        context.workspaceId,
      );
      if (!updated) return result({ error: "Todo not found in the configured workspace." });
      return result({ workspace: context.workspaceName, task: { id: updated.todo.id, reference: updated.todo.reference, title: updated.todo.title, status: updated.todo.status } });
    },
  );

  server.registerTool(
    "vitals_capture_idea",
    {
      title: "Capture a Vitals idea",
      description: "Captures an idea in Inbox status, optionally under a project. An idea is only included in task context after it is promoted by linking it to a task.",
      inputSchema: { title: z.string().min(1).max(500), description: z.string().min(1).max(10_000), projectId: identifier.optional() },
    },
    async ({ title, description, projectId }) => {
      if (projectId) projectId = await resolveId(context, "project", projectId);
      await validateLinks(context, { projectId });
      const idea = await notesRepo.createNote(
        {
          title,
          content: description,
          rawContent: description,
          contentType: "idea",
          domain: "project",
          domainId: projectId ?? null,
          tags: ["idea", "inbox"],
        },
        context.userId,
        context.workspaceId,
      );
      return result({ workspace: context.workspaceName, idea: { id: idea.id, reference: idea.reference, title: idea.title, projectId: idea.domainId, status: "inbox" } });
    },
  );

  server.registerTool(
    "vitals_list_ideas",
    {
      title: "List Vitals ideas",
      description: "Lists captured ideas, optionally for a project. Inbox ideas remain separate from task context until promoted.",
      inputSchema: { projectId: identifier.optional(), includePromoted: z.boolean().optional() },
    },
    async ({ projectId, includePromoted = true }) => {
      if (projectId) projectId = await resolveId(context, "project", projectId);
      if (projectId) await validateLinks(context, { projectId });
      const ideas = (await notesRepo.listNotes(context.userId, context.workspaceId))
        .filter((note) => note.contentType === "idea" && (!projectId || note.domainId === projectId))
        .filter((note) => includePromoted || !note.tags.includes("promoted"))
        .map((note) => ({ id: note.id, reference: note.reference, title: note.title ?? "Untitled", description: note.content, projectId: note.domainId, status: note.tags.includes("promoted") ? "promoted" : "inbox" }));
      return result({ workspace: context.workspaceName, ideas });
    },
  );

  server.registerTool(
    "vitals_record_decision",
    {
      title: "Record a Vitals decision",
      description: "Records a durable decision note, optionally linked to a project.",
      inputSchema: { title: z.string().min(1).max(500), rationale: z.string().min(1).max(10_000), projectId: identifier.optional() },
    },
    async ({ title, rationale, projectId }) => {
      if (projectId) projectId = await resolveId(context, "project", projectId);
      await validateLinks(context, { projectId });
      const decision = await notesRepo.createNote(
        {
          title: `Decision: ${title}`,
          content: rationale,
          rawContent: rationale,
          contentType: "paste",
          domain: "project",
          domainId: projectId ?? null,
          tags: ["decision"],
        },
        context.userId,
        context.workspaceId,
      );
      return result({ workspace: context.workspaceName, decision: { id: decision.id, reference: decision.reference, title: decision.title, projectId: decision.domainId } });
    },
  );

  server.registerTool(
    "vitals_project_status",
    {
      title: "Get Vitals project status",
      description: "Returns a compact project-status view with goals and task counts, without unrelated workspace data.",
      inputSchema: { projectId: identifier },
    },
    async ({ projectId }) => {
      if (projectId) projectId = await resolveId(context, "project", projectId);
      const project = await projectsRepo.getProjectById(projectId, context.userId, context.workspaceId);
      if (!project) return result({ error: "Project not found in the configured workspace." });
      const [goals, tasks] = await Promise.all([
        goalsRepo.listGoalsByProjectId(projectId, context.userId, context.workspaceId),
        todosRepo.listTodosByProjectId(projectId, context.userId, context.workspaceId),
      ]);
      return result({
        workspace: context.workspaceName,
        project: { id: project.id, key: project.key, name: project.name, description: project.description },
        goals: goals.map((goal) => ({ id: goal.id, reference: goal.reference, title: goal.title, status: goal.status, progress: goal.progress })),
        taskCounts: {
          todo: tasks.filter((task) => task.status === "todo").length,
          inProgress: tasks.filter((task) => task.status === "in_progress").length,
          done: tasks.filter((task) => task.status === "done").length,
        },
      });
    },
  );

  server.registerTool(
    "vitals_context_for_task",
    {
      title: "Get just-in-time coding context for a task",
      description: "Returns only the selected project's goal, task, acceptance criteria, related decisions, promoted idea, and validated dependencies.",
      inputSchema: { project: identifier.optional(), projectId: identifier.optional(), task: z.string().min(1).max(500) },
    },
    async ({ project: projectSelector, projectId, task }) => {
      if (!projectSelector && !projectId) throw new Error("Provide project or projectId.");
      if (projectSelector) {
        const resolved = await resolveId(context, "project", projectSelector);
        if (projectId && await resolveId(context, "project", projectId) !== resolved) throw new Error("project and projectId disagree.");
        projectId = resolved;
      }
      if (!projectId) throw new Error("Project is required.");
      if (projectId) projectId = await resolveId(context, "project", projectId);
      const project = await projectsRepo.getProjectById(projectId, context.userId, context.workspaceId);
      if (!project) return result({ error: "Project not found in the configured workspace." });
      const selector = task.trim();
      let selectedTask = await (z.string().uuid().safeParse(selector).success
        ? todosRepo.getTodoById : todosRepo.getTodoByReference)(selector, context.userId, context.workspaceId);
      const projectTasks = await todosRepo.listTodosByProjectId(projectId, context.userId, context.workspaceId);
      if (!selectedTask) {
        const matches = projectTasks.filter((candidate) => candidate.title.toLocaleLowerCase() === selector.toLocaleLowerCase());
        if (matches.length > 1) throw new Error("Task title is ambiguous; use its reference or UUID.");
        selectedTask = matches[0] ?? null;
      }
      if (!selectedTask || !projectTasks.some((candidate) => candidate.id === selectedTask!.id)) {
        return result({ error: "Task not found in the selected project." });
      }

      const [projectGoals, projectNotes] = await Promise.all([
        goalsRepo.listGoalsByProjectId(projectId, context.userId, context.workspaceId),
        notesRepo.listNotesByDomain("project", context.userId, context.workspaceId, projectId),
      ]);
      const currentGoal = selectedTask.goalId
        ? await goalsRepo.getGoalById(selectedTask.goalId, context.userId, context.workspaceId)
        : projectGoals.find((goal) => goal.status !== "done") ?? null;
      const idea = selectedTask.sourceNoteId ? await getIdea(context, selectedTask.sourceNoteId).catch(() => null) : null;
      const dependencyIds = selectedTask.tags.filter((tag) => tag.startsWith("depends-on:")).map((tag) => tag.slice("depends-on:".length));
      const dependencies = (await Promise.all(dependencyIds.map((id) => todosRepo.getTodoById(id, context.userId, context.workspaceId)))).filter(Boolean);

      return result({
        workspace: context.workspaceName,
        project: { id: project.id, key: project.key, name: project.name, goal: currentGoal ? { id: currentGoal.id, reference: currentGoal.reference, title: currentGoal.title, progress: currentGoal.progress } : null },
        task: {
          id: selectedTask.id, reference: selectedTask.reference,
          title: selectedTask.title,
          status: selectedTask.status,
          acceptanceCriteria: selectedTask.description,
          dueDate: selectedTask.dueDate ? isoDate(selectedTask.dueDate) : null,
        },
        relatedDecisions: projectNotes.filter((note) => note.tags.includes("decision")).map((note) => ({ id: note.id, reference: note.reference, title: note.title, rationale: note.content })),
        relatedIdeas: idea ? [{ id: idea.id, reference: idea.reference, title: idea.title, description: idea.content }] : [],
        dependencies: dependencies.map((dependency) => ({ id: dependency!.id, reference: dependency!.reference, title: dependency!.title, status: dependency!.status })),
      });
    },
  );

  return server;
}

async function main() {
  const context = await loadContext();
  if (process.env.MCP_TRANSPORT !== "http") {
    const server = await createServer(context);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }

  const accessToken = process.env.MCP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MCP_ACCESS_TOKEN is required for the HTTP transport.");

  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.get("/health", (_request, response) => response.json({ status: "ok" }));

  app.use("/mcp", (request, response, next) => {
    if (request.headers.authorization !== `Bearer ${accessToken}`) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  });

  app.post("/mcp", async (request, response) => {
    const server = await createServer(context);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    response.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      console.error("MCP request failed", error);
      if (!response.headersSent) {
        response.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });

  const methodNotAllowed = (_request: unknown, response: { status: (code: number) => { json: (body: unknown) => void } }) => {
    response.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
  };
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  const port = Number(process.env.PORT ?? 8080);
  app.listen(port, () => console.log(`Vitals MCP listening on port ${port}`));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });

// The stdio transport remains active until its host exits. Close the shared
// database pool only during process shutdown, not after server.connect().
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void closeDb().finally(() => process.exit());
  });
}
