import { createClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";

let client: ReturnType<typeof createClient> | undefined;

// Service-role client — only ever used server-side to introspect a bearer
// token. Verifying via auth.getUser() (a call to Supabase's Auth API) rather
// than checking the JWT signature locally works regardless of whether a
// project signs tokens with the legacy shared secret or newer asymmetric
// keys, at the cost of one extra network hop per request — an acceptable
// tradeoff at this app's scale.
function getSupabaseAdmin() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    }
    client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  }
  return client;
}

// Sets req.userId from a verified `Authorization: Bearer <token>` header, or
// replies 401. Must be called on the root app instance *before* the domain
// route plugins are registered (server.ts) — Fastify hooks added this way
// are inherited by every child context registered afterward, so this
// doesn't need the fastify-plugin wrapper to escape encapsulation.
export function registerAuth(app: FastifyInstance) {
  app.addHook("onRequest", async (req, reply) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
    if (!token) {
      return reply.code(401).send({ error: "Missing Authorization header" });
    }

    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !data.user) {
      return reply.code(401).send({ error: "Invalid or expired token" });
    }

    req.userId = data.user.id;
  });
}
