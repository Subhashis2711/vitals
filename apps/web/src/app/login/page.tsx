"use client";

import { Activity } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setSigningIn(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-sm shadow-cyan-500/30">
          <Activity className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">Vitals</h1>
        <p className="mt-1 text-sm text-neutral-500">Sign in to access your workspace.</p>
        <button
          type="button"
          onClick={handleSignIn}
          disabled={signingIn}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100 disabled:opacity-50"
        >
          {signingIn ? "Redirecting..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
