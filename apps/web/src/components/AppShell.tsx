"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";

// /login and /auth/* are full-bleed pages with their own min-h-screen
// container — nesting them inside the app shell's own min-h-screen flex
// wrapper (plus main's padding) stacks two viewport-height boxes, making the
// page taller than the viewport and scrollable. Those routes render on their
// own instead, matching Sidebar's own existing null-check for the same paths.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth");

  if (isAuthPage) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
