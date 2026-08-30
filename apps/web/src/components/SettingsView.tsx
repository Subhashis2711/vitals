"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/cn";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currency";
import { fieldInputClass, fieldSelectClass } from "@/lib/fieldStyles";
import { createClient } from "@/lib/supabase/client";

export function SettingsView() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [savingCurrency, setSavingCurrency] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      const metadata = data.user?.user_metadata ?? {};
      const existing = metadata.full_name ?? metadata.name ?? "";
      setName(existing);
      setSavedName(existing);
      setCurrency(metadata.currency ?? DEFAULT_CURRENCY);
    });
  }, []);

  async function handleSaveName() {
    const trimmed = name.trim();
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
      if (error) throw error;
      setSavedName(trimmed);
      toast.success("Name saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save name");
    } finally {
      setSaving(false);
    }
  }

  async function handleCurrencyChange(code: string) {
    setCurrency(code);
    setSavingCurrency(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { currency: code } });
      if (error) throw error;
      toast.success("Currency updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save currency");
    } finally {
      setSavingCurrency(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Account</h2>

        <label className="block text-xs text-neutral-600 dark:text-neutral-500">
          Display name
          <div className="mt-1 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              className={fieldInputClass}
            />
            <button
              type="button"
              onClick={handleSaveName}
              disabled={saving || name.trim() === savedName}
              className="shrink-0 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </label>

        <p className="mt-4 text-xs text-neutral-600 dark:text-neutral-500">Signed in as</p>
        <p className="mt-0.5 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{email ?? "—"}</p>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 transition-colors hover:border-red-500/40 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </section>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Preferences</h2>

        <ThemeToggle />

        <label className="mt-4 block text-xs text-neutral-600 dark:text-neutral-500">
          Currency
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            disabled={savingCurrency}
            className={cn("mt-1 w-full", fieldSelectClass, "disabled:opacity-50")}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-600">Used to format amounts in Finance.</p>
      </section>
    </div>
  );
}
