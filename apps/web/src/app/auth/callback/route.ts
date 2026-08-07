import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Exchanges the Google OAuth code for a Supabase session — the redirect
// target of signInWithOAuth() in app/login/page.tsx.
export async function GET(request: Request) {
  const { searchParams, origin: directOrigin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Behind a reverse proxy (Cloud Run, etc.) `request.url` reflects the
  // container's own bind address, not the public host — prefer the
  // forwarded headers the proxy sets when present.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : directOrigin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
