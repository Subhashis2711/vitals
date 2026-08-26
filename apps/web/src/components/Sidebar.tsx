"use client";

import {
  Activity,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Folder,
  HeartPulse,
  ListTodo,
  LogOut,
  PenLine,
  Repeat,
  Settings,
  StickyNote,
  Target,
  Timer,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatTimer, usePomodoro } from "@/lib/pomodoro-context";
import { createClient } from "@/lib/supabase/client";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

type NavLinkDef = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const SECTIONS: { label: string; links: NavLinkDef[] }[] = [
  {
    label: "Productivity",
    links: [
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/projects", label: "Projects", icon: Folder },
      { href: "/todos", label: "Todos", icon: ListTodo },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/focus", label: "Focus", icon: Timer },
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

// Shown as icon-only quick links in the mobile top bar — the handful of
// destinations worth one tap without opening the "more" dropdown. There's no
// dedicated Home entry — the logo mark itself is the way back to the
// dashboard, on both mobile and desktop. Everything else in SECTIONS falls
// into MOBILE_MORE_LINKS below.
const MOBILE_QUICK_LINKS: NavLinkDef[] = [
  { href: "/todos", label: "Todos", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/habits", label: "Habits", icon: Repeat },
];

const MOBILE_QUICK_HREFS = new Set(MOBILE_QUICK_LINKS.map((l) => l.href));
const MOBILE_MORE_LINKS = SECTIONS.flatMap((s) => s.links).filter((l) => !MOBILE_QUICK_HREFS.has(l.href));

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  // Close the "more" dropdown on every navigation.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Close the "more" dropdown on any click outside the pill — a plain
  // full-screen overlay would sit above the dropdown's own links in the
  // stacking order and swallow clicks meant for them, so this listens on
  // the document instead of relying on an intercepting backdrop.
  useEffect(() => {
    if (!moreOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [moreOpen]);

  const activeMoreLink = MOBILE_MORE_LINKS.find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`));
  // Always exactly 4 quick-link slots — when a "more" page is active, it
  // takes over the last slot instead of the dropdown icon disappearing. The
  // quick link it bumps out (Habits) moves into the dropdown in its place,
  // so nothing becomes unreachable while browsing a "more" page.
  const bumpedQuickLink = MOBILE_QUICK_LINKS[MOBILE_QUICK_LINKS.length - 1];
  const visibleQuickLinks = activeMoreLink ? [...MOBILE_QUICK_LINKS.slice(0, -1), activeMoreLink] : MOBILE_QUICK_LINKS;
  const visibleMoreLinks = activeMoreLink
    ? [bumpedQuickLink, ...MOBILE_MORE_LINKS.filter((l) => l.href !== activeMoreLink.href)]
    : MOBILE_MORE_LINKS;

  if (pathname === "/login" || pathname.startsWith("/auth")) return null;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-2 z-30 px-3 md:hidden">
        <div
          ref={pillRef}
          className="relative flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900/95 p-1.5 shadow-lg shadow-black/20 backdrop-blur"
        >
          <Link
            href="/"
            aria-label="Dashboard"
            title="Dashboard"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-sm shadow-cyan-500/30"
          >
            <Activity className="h-4 w-4" />
          </Link>
          <nav className="flex flex-1 items-center justify-around">
            {visibleQuickLinks.map((link) => {
              const active = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-label={link.label}
                  title={link.label}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    active ? "bg-cyan-400 text-white shadow-sm shadow-cyan-400/30" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-label={moreOpen ? "Hide more links" : "Show more links"}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
              moreOpen ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100",
            )}
          >
            {moreOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {moreOpen && (
            <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-2xl border border-neutral-800 bg-neutral-900 p-1.5 shadow-2xl">
              <WorkspaceSwitcher />
              <div className="my-1.5 border-t border-neutral-800" />
              <div className="space-y-0.5">
                {visibleMoreLinks.map((link) => {
                  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active ? "bg-cyan-400 text-white shadow-sm shadow-cyan-400/30" : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
              <div className="my-1.5 border-t border-neutral-800" />
              <AccountSection pathname={pathname} email={email} onSignOut={handleSignOut} />
            </div>
          )}
        </div>
      </header>

      <aside className="hidden flex-col border border-neutral-800 bg-neutral-900/60 p-3 md:sticky md:top-0 md:z-auto md:m-3 md:flex md:h-[calc(100vh-1.5rem)] md:w-60 md:rounded-2xl">
        <div className="flex items-center gap-2.5 px-1.5 py-2">
          <Link
            href="/"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white shadow-sm shadow-cyan-500/30"
          >
            <Activity className="h-4.5 w-4.5" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href="/" className="block text-sm font-bold leading-tight text-neutral-50 hover:text-neutral-200">
              Vitals
            </Link>
            <WorkspaceSwitcher compact />
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-5 overflow-y-auto px-0.5 py-2">
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

        <MiniTimer pathname={pathname} />

        <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-1.5">
          <AccountSection pathname={pathname} email={email} onSignOut={handleSignOut} />
        </div>
      </aside>
    </>
  );
}

function AccountSection({
  pathname,
  email,
  onSignOut,
}: {
  pathname: string;
  email: string | null;
  onSignOut: () => void;
}) {
  const settingsActive = pathname === "/settings" || pathname.startsWith("/settings/");
  return (
    <div className="space-y-1">
      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
          settingsActive ? "bg-cyan-400 text-white shadow-sm shadow-cyan-400/30" : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100",
        )}
      >
        <Settings className="h-4 w-4" />
        Settings
      </Link>
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <p className="min-w-0 truncate text-[11px] text-neutral-500" title={email ?? undefined}>
          {email ?? "Signed in"}
        </p>
        <button type="button" onClick={onSignOut} title="Sign out" className="shrink-0 text-neutral-500 hover:text-red-400">
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function MiniTimer({ pathname }: { pathname: string }) {
  const { mode, running, remainingSeconds } = usePomodoro();
  if (!running || pathname === "/focus") return null;
  return (
    <Link
      href="/focus"
      className="mb-2 flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-400/20"
    >
      <Timer className="h-4 w-4" />
      {formatTimer(remainingSeconds)}
      <span className="ml-auto text-[10px] font-normal uppercase tracking-wider text-cyan-300/70">
        {mode === "focus" ? "Focus" : "Break"}
      </span>
    </Link>
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
        "flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors md:py-2",
        active ? "bg-cyan-400 text-white shadow-sm shadow-cyan-400/30" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
