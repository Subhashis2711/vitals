import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

// Refreshes the Supabase session cookie on every request (required by
// @supabase/ssr) and doubles as the route guard — no session, no app.
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    // Behind a reverse proxy (Cloud Run, etc.) nextUrl's host reflects the
    // container's own bind address, not the public host.
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) {
      const proto = request.headers.get("x-forwarded-proto") ?? "https";
      url.protocol = proto;
      // `host` (not `hostname`) — forwardedHost may carry its own ":port"
      // (e.g. Next's own dev server sets "localhost:3000", which is the
      // real port the browser is using and must be kept). But behind an
      // https-terminating proxy (Cloud Run, etc.) forwardedHost instead
      // carries the *container's* internal port (e.g. ":8080" from
      // PORT=8080) — https traffic always arrives on the implicit 443, so
      // that port is never real and must be stripped or the redirect ends
      // up pointing at a port the public host doesn't expose.
      url.host = proto === "https" ? forwardedHost.split(":")[0] : forwardedHost;
    }
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
