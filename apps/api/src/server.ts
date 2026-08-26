import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerAuth } from "./plugins/auth";
import { registerWorkspace } from "./plugins/workspace";
import { calendarRoutes } from "./routes/calendar";
import { goalsRoutes } from "./routes/goals";
import { habitsRoutes } from "./routes/habits";
import { healthRoutes } from "./routes/health";
import { journalRoutes } from "./routes/journal";
import { learningRoutes } from "./routes/learning";
import { markdownRoutes } from "./routes/markdown";
import { moneyRoutes } from "./routes/money";
import { notesRoutes } from "./routes/notes";
import { pomodoroRoutes } from "./routes/pomodoro";
import { projectsRoutes } from "./routes/projects";
import { todosRoutes } from "./routes/todos";
import { workspacesRoutes } from "./routes/workspaces";

export function buildServer() {
  const app = Fastify({ logger: true });

  // Comma-separated allowlist (dev + prod origin) — see WEB_ORIGIN in
  // .env.example. @fastify/cors defaults `methods` to "GET,HEAD,POST";
  // without the explicit list, PATCH/DELETE calls fail CORS preflight.
  const allowedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(",").map((o) => o.trim());
  app.register(cors, { origin: allowedOrigins, methods: ["GET", "HEAD", "POST", "PATCH", "DELETE"] });

  // Unauthenticated — Render's uptime checks hit this without a Supabase
  // session. Registered directly on the root instance, as a sibling of the
  // protected child context below, so it never inherits that context's auth
  // hook (Fastify hooks flow down to children, not sideways — adding the
  // hook to `app` itself and registering /health "before" it in source order
  // does NOT exempt it, hooks are resolved by encapsulation, not by
  // source-order).
  app.get("/health", async () => ({ status: "ok" }));

  // Every route registered inside this child context requires a verified
  // Supabase user — see plugins/auth.ts. Route handlers read req.userId.
  app.register(async (protectedApp) => {
    registerAuth(protectedApp);

    // Outside the workspace-resolution context below — a client needs to be
    // able to list/create workspaces before it has one selected.
    protectedApp.register(workspacesRoutes, { prefix: "/workspaces" });

    // Every route registered inside this nested context also requires a
    // resolved workspace — see plugins/workspace.ts. Route handlers read
    // req.workspaceId in addition to req.userId.
    protectedApp.register(async (workspaceScopedApp) => {
      registerWorkspace(workspaceScopedApp);

      workspaceScopedApp.register(todosRoutes, { prefix: "/todos" });
      workspaceScopedApp.register(notesRoutes, { prefix: "/notes" });
      workspaceScopedApp.register(markdownRoutes, { prefix: "/markdown" });
      workspaceScopedApp.register(projectsRoutes, { prefix: "/projects" });
      workspaceScopedApp.register(habitsRoutes, { prefix: "/habits" });
      workspaceScopedApp.register(goalsRoutes, { prefix: "/goals" });
      workspaceScopedApp.register(calendarRoutes, { prefix: "/calendar" });
      workspaceScopedApp.register(learningRoutes, { prefix: "/learning" });
      workspaceScopedApp.register(journalRoutes, { prefix: "/journal" });
      workspaceScopedApp.register(healthRoutes, { prefix: "/wellness" });
      workspaceScopedApp.register(moneyRoutes, { prefix: "/money" });
      workspaceScopedApp.register(pomodoroRoutes, { prefix: "/pomodoro" });
    });
  });

  return app;
}
