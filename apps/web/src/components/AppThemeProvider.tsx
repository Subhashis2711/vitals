"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

// class-based (not media-query-based) so the toggle in Settings/Sidebar can
// override the OS preference — see the `@custom-variant dark` rule in
// globals.css this pairs with. defaultTheme "dark" preserves this app's
// original (and only, until now) look for anyone who hasn't chosen yet.
export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}
