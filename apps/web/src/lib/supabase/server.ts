import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Components/Route Handlers only (uses next/headers) — see
// lib/supabase/client.ts for the browser equivalent, and lib/api.ts for why
// both exist.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component that can't set cookies — fine,
          // middleware.ts refreshes the session on every request instead.
        }
      },
    },
  });
}
