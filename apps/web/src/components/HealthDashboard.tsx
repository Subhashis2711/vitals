"use client";

import type { HealthActivityLog, HealthDailyLog } from "@vitals/shared";
import { Droplet, Flame, Footprints, Moon, Plus, Scale, Trash2, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { EmptyState } from "@/components/EmptyState";
import { createHealthActivityLog, deleteHealthActivityLog, upsertHealthDailyLog } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { todayISO } from "@/lib/date";
import { fieldInputClass, fieldInputCompactClass, fieldLabelClass } from "@/lib/fieldStyles";
import { rowIconButtonClass } from "@/lib/rowIconButton";

function last7Dates(): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString("en-CA"));
  }
  return dates;
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "narrow" });
}

export function HealthDashboard({
  initialDailyLogs,
  initialActivityLogs,
}: {
  initialDailyLogs: HealthDailyLog[];
  initialActivityLogs: HealthActivityLog[];
}) {
  const [dailyLogs, setDailyLogs] = useState(initialDailyLogs);
  const [activityLogs, setActivityLogs] = useState(initialActivityLogs);
  const [sport, setSport] = useState("");
  const [duration, setDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingWater, setSavingWater] = useState(false);

  const today = todayISO();
  const todayLog = dailyLogs.find((l) => l.date === today) ?? null;

  const [steps, setSteps] = useState(todayLog?.steps?.toString() ?? "");
  const [sleepHours, setSleepHours] = useState(todayLog?.sleepHours?.toString() ?? "");
  const [weightKg, setWeightKg] = useState(todayLog?.weightKg?.toString() ?? "");
  const [savingDailyLog, setSavingDailyLog] = useState(false);

  async function handleSaveDailyLog(e: FormEvent) {
    e.preventDefault();
    setSavingDailyLog(true);
    try {
      const { log } = await upsertHealthDailyLog({
        date: today,
        steps: steps.trim() ? Number(steps) : null,
        sleepHours: sleepHours.trim() ? Number(sleepHours) : null,
        weightKg: weightKg.trim() ? Number(weightKg) : null,
      });
      setDailyLogs((prev) => [...prev.filter((l) => l.date !== today), log]);
      toast.success("Today's log saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save log");
    } finally {
      setSavingDailyLog(false);
    }
  }

  const days7 = last7Dates();
  const stepsData = days7.map((d) => ({ label: dayLabel(d), value: dailyLogs.find((l) => l.date === d)?.steps ?? 0 }));
  const sleepData = days7.map((d) => ({
    label: dayLabel(d),
    value: dailyLogs.find((l) => l.date === d)?.sleepHours ?? 0,
  }));
  const weightData = [...dailyLogs]
    .filter((l): l is HealthDailyLog & { weightKg: number } => l.weightKg != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({ label: l.date.slice(5), value: l.weightKg }));

  const activeThisWeekMin = activityLogs.filter((a) => days7.includes(a.date)).reduce((sum, a) => sum + a.durationMin, 0);
  const activeSessionsThisWeek = activityLogs.filter((a) => days7.includes(a.date)).length;
  const latestWeight = weightData.length > 0 ? weightData[weightData.length - 1].value : null;

  async function setWaterCups(count: number) {
    setSavingWater(true);
    try {
      const { log } = await upsertHealthDailyLog({ date: today, waterCups: count });
      setDailyLogs((prev) => [...prev.filter((l) => l.date !== today), log]);
    } finally {
      setSavingWater(false);
    }
  }

  function handleCupClick(index: number) {
    const current = todayLog?.waterCups ?? 0;
    const clicked = index + 1;
    setWaterCups(clicked === current ? clicked - 1 : clicked);
  }

  async function handleAddActivity(e: FormEvent) {
    e.preventDefault();
    const mins = Number(duration);
    if (!sport.trim() || !mins || mins <= 0) return;
    setSubmitting(true);
    try {
      const { log } = await createHealthActivityLog({ date: today, sport: sport.trim(), durationMin: mins });
      setActivityLogs((prev) => [log, ...prev]);
      setSport("");
      setDuration("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteActivity(id: string, sport: string) {
    setActivityLogs((prev) => prev.filter((a) => a.id !== id));
    await deleteHealthActivityLog(id);
    toast(`Deleted "${sport}"`);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600 dark:text-neutral-500">Everything here is computed from what you log — nothing fake.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Steps today"
          value={todayLog?.steps != null ? todayLog.steps.toLocaleString() : "—"}
          icon={Footprints}
        />
        <StatCard label="Sleep" value={todayLog?.sleepHours != null ? `${todayLog.sleepHours}h` : "—"} icon={Moon} />
        <StatCard
          label="Active this week"
          value={`${activeThisWeekMin}min`}
          sub={`${activeSessionsThisWeek} sessions`}
          icon={Flame}
        />
        <StatCard label="Weight" value={latestWeight != null ? `${latestWeight}kg` : "—"} icon={Scale} />
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <Droplet className="h-4 w-4 text-blue-400" />
            Water
          </h3>
          <span className="text-xs text-neutral-600 dark:text-neutral-500">{todayLog?.waterCups ?? 0}/8 cups</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <button
              key={i}
              type="button"
              disabled={savingWater}
              onClick={() => handleCupClick(i)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-50",
                (todayLog?.waterCups ?? 0) > i
                  ? "border-blue-500 bg-blue-500/20 text-blue-400"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-300 dark:text-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600",
              )}
            >
              <Droplet className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <Footprints className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
          Log today
        </h3>
        <form onSubmit={handleSaveDailyLog} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div>
            <label className={fieldLabelClass}>Steps</label>
            <input
              type="number"
              min={0}
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="e.g. 8000"
              className={fieldInputCompactClass}
            />
          </div>
          <div>
            <label className={fieldLabelClass}>Sleep (hours)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="e.g. 7.5"
              className={fieldInputCompactClass}
            />
          </div>
          <div>
            <label className={fieldLabelClass}>Weight (kg)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g. 70"
              className={fieldInputCompactClass}
            />
          </div>
          <button
            type="submit"
            disabled={savingDailyLog}
            className="rounded-lg bg-cyan-400 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            Save
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Activity log</h3>
          <form onSubmit={handleAddActivity} className="mb-3 flex flex-wrap gap-2">
            <input
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              placeholder="Activity (e.g. Running)"
              className={cn(fieldInputClass, "min-w-0 flex-1")}
            />
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="min"
              className="w-20 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-inner shadow-black/5 transition-all duration-150 hover:border-neutral-400 focus:border-cyan-400/70 focus:outline-none focus:ring-4 focus:ring-cyan-400/10 dark:border-neutral-700/80 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:shadow-black/20 dark:hover:border-neutral-600"
            />
            <button
              type="submit"
              disabled={submitting || !sport.trim() || !duration}
              className="flex items-center gap-1 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
          <ul className="space-y-1.5">
            {activityLogs.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="group flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-950/60 p-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-neutral-800 dark:text-neutral-200">{a.sport}</p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-500">{a.date}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-neutral-500 dark:text-neutral-400">{a.durationMin}min</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteActivity(a.id, a.sport)}
                    className={cn(rowIconButtonClass, "-m-1.5")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
            {activityLogs.length === 0 && <EmptyState as="li" icon={Footprints} message="No activity logged yet." />}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-500">Sleep · 7 days</h3>
            <BarChart data={sleepData} color="#a855f7" />
          </div>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-500">Steps · 7 days</h3>
            <BarChart data={stepsData} color="#06b6d4" />
          </div>
          {weightData.length > 1 && (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-500">Weight trend</h3>
              <LineChart data={weightData} color="#22c55e" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
      {sub && <p className="text-xs text-neutral-600 dark:text-neutral-500">{sub}</p>}
    </div>
  );
}
