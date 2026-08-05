import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges the Google OAuth code for a Supabase session — the redirect
// target of signInWithOAuth() in app/login/page.tsx.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
