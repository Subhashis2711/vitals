import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { AppThemeProvider } from "@/components/AppThemeProvider";
import { AppToaster } from "@/components/AppToaster";
import { CaptureModal } from "@/components/CaptureModal";
import { CommandPalette } from "@/components/CommandPalette";
import { cn } from "@/lib/cn";
import { PomodoroProvider } from "@/lib/pomodoro-context";
import { UIProvider } from "@/lib/ui-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vitals",
  description: "Personal notes, todos, and AI-assisted capture.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes sets the `dark` class on <html>
    // from localStorage before React hydrates, which legitimately differs
    // from this server-rendered markup — see next-themes' docs.
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100")}>
        <AppThemeProvider>
          <UIProvider>
            <PomodoroProvider>
              <AppShell>{children}</AppShell>
              <CommandPalette />
              <CaptureModal />
            </PomodoroProvider>
          </UIProvider>
          <AppToaster />
        </AppThemeProvider>
      </body>
    </html>
  );
}
