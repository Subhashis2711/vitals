"use client";

import {
  BookOpen,
  Brain,
  Calendar,
  Folder,
  HeartPulse,
  Home,
  ListTodo,
  LogOut,
  PenLine,
  Repeat,
  StickyNote,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

const SECTIONS: { label: string; links: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Plan & Do",
    links: [
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/projects", label: "Projects", icon: Folder },
      { href: "/todos", label: "Todos", icon: ListTodo },
      { href: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Knowledge",
    links: [
      { href: "/notes", label: "Notes", icon: StickyNote },
      { href: "/learning", label: "Learning", icon: BookOpen },
    ],
  },
  {
    label: "Self",
    links: [
      { href: "/journal", label: "Journal", icon: PenLine },
      { href: "/habits", label: "Habits", icon: Repeat },
      { href: "/health", label: "Health", icon: HeartPulse },
    ],
  },
  {
    label: "Money",
    links: [{ href: "/money", label: "Money", icon: Wallet }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  if (pathname === "/login" || pathname.startsWith("/auth")) return null;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="m-3 flex h-[calc(100vh-1.5rem)] w-60 shrink-0 flex-col rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
      <div className="flex items-center gap-2.5 px-1.5 py-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/30">
          <Brain className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-bold leading-tight text-neutral-50">Vitals</p>
          <p className="text-[11px] text-neutral-500">Personal workspace</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-5 overflow-y-auto px-0.5 py-2">
        <NavLink href="/" label="Home" icon={Home} pathname={pathname} exact />

        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.links.map((link) => (
                <NavLink key={link.href} {...link} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
        <p className="min-w-0 truncate text-[11px] text-neutral-500" title={email ?? undefined}>
          {email ?? "Signed in"}
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          title="Sign out"
          className="shrink-0 text-neutral-500 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  exact,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  pathname: string;
  exact?: boolean;
}) {
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active ? "bg-orange-500 text-white shadow-sm shadow-orange-500/30" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
