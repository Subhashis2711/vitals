import cors from "@fastify/cors";
import Fastify from "fastify";
import { registerAuth } from "./plugins/auth";
import { calendarRoutes } from "./routes/calendar";
import { goalsRoutes } from "./routes/goals";
import { habitsRoutes } from "./routes/habits";
import { healthRoutes } from "./routes/health";
import { journalRoutes } from "./routes/journal";
import { learningRoutes } from "./routes/learning";
import { markdownRoutes } from "./routes/markdown";
import { moneyRoutes } from "./routes/money";
import { notesRoutes } from "./routes/notes";
import { projectsRoutes } from "./routes/projects";
import { todosRoutes } from "./routes/todos";

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

    protectedApp.register(todosRoutes, { prefix: "/todos" });
    protectedApp.register(notesRoutes, { prefix: "/notes" });
    protectedApp.register(markdownRoutes, { prefix: "/markdown" });
    protectedApp.register(projectsRoutes, { prefix: "/projects" });
    protectedApp.register(habitsRoutes, { prefix: "/habits" });
    protectedApp.register(goalsRoutes, { prefix: "/goals" });
    protectedApp.register(calendarRoutes, { prefix: "/calendar" });
    protectedApp.register(learningRoutes, { prefix: "/learning" });
    protectedApp.register(journalRoutes, { prefix: "/journal" });
    protectedApp.register(healthRoutes, { prefix: "/wellness" });
    protectedApp.register(moneyRoutes, { prefix: "/money" });
  });

  return app;
}
