"use client";

import { Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleGoogleSignIn() {
    setSigningIn(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (signUpError) throw signUpError;
        // A project with email confirmations enabled returns a user but no
        // session yet — the account only becomes usable after they click the
        // confirmation link. Confirmations disabled (the local dev default)
        // returns a session immediately, so just go straight in.
        if (!data.session) {
          setConfirmSent(true);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setConfirmSent(false);
  }

  return (
    <div className="flex h-screen items-center justify-center overflow-y-auto bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-sm shadow-cyan-500/30">
          <Activity className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-neutral-950 dark:text-neutral-50">Vitals</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-500">Sign in to access your workspace.</p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100 disabled:opacity-50"
        >
          {signingIn ? "Redirecting..." : "Sign in with Google"}
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          <span className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-600">or</span>
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </div>

        {confirmSent ? (
          <p className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2.5 text-left text-sm text-neutral-700 dark:text-neutral-300">
            Check <span className="font-medium text-neutral-900 dark:text-neutral-100">{email}</span> for a confirmation
            link to finish creating your account.
          </p>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-2.5 text-left">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-cyan-400/60 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-cyan-400/60 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
            >
              {submitting ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
        )}

        {!confirmSent && (
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-600">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("signin")} className="font-medium text-cyan-600 hover:underline dark:text-cyan-300">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button type="button" onClick={() => switchMode("signup")} className="font-medium text-cyan-600 hover:underline dark:text-cyan-300">
                  Create one
                </button>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
