"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster richColors theme={resolvedTheme === "light" ? "light" : "dark"} position="bottom-right" />;
}
