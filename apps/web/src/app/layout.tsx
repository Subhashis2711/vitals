import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { CaptureModal } from "@/components/CaptureModal";
import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/cn";
import { UIProvider } from "@/lib/ui-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vitals",
  description: "Personal notes, todos, and AI-assisted capture.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "bg-neutral-950 text-neutral-100 antialiased")}>
        <UIProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 px-8 py-6">
              <div className="mx-auto max-w-5xl">{children}</div>
            </main>
          </div>
          <CommandPalette />
          <CaptureModal />
        </UIProvider>
        <Toaster richColors theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
