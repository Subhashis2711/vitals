"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function computeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// The dashboard greeting needs the *visitor's* local time, not the server's
// — DashboardPage is a Server Component, so computing this during render
// would use whatever timezone the server happens to run in (e.g. Cloud Run
// defaults to UTC), showing "Good afternoon" at 7pm IST. Deferring to an
// effect guarantees it reads the browser's clock instead.
export function Greeting() {
  const [greeting, setGreeting] = useState("Welcome back");
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(computeGreeting());
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const metadata = data.user?.user_metadata ?? {};
      setName(metadata.full_name ?? metadata.name ?? null);
    });
  }, []);

  return <>{name ? `${greeting}, ${name}` : greeting}</>;
}
