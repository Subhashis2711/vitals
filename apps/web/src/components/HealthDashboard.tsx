"use client";

import type { HealthActivityLog, HealthDailyLog } from "@vitals/shared";
import { Droplet, Flame, Footprints, Moon, Plus, Scale, Trash2, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { createHealthActivityLog, deleteHealthActivityLog, upsertHealthDailyLog } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { todayISO } from "@/lib/date";

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

  async function handleDeleteActivity(id: string) {
    setActivityLogs((prev) => prev.filter((a) => a.id !== id));
    await deleteHealthActivityLog(id);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">Everything here is computed from what you log — nothing fake.</p>

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

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-200">
            <Droplet className="h-4 w-4 text-blue-400" />
            Water
          </h3>
          <span className="text-xs text-neutral-500">{todayLog?.waterCups ?? 0}/8 cups</span>
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
                  : "border-neutral-800 text-neutral-700 hover:border-neutral-600",
              )}
            >
              <Droplet className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-200">Activity log</h3>
          <form onSubmit={handleAddActivity} className="mb-3 flex flex-wrap gap-2">
            <input
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              placeholder="Activity (e.g. Running)"
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500/60 focus:outline-none"
            />
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="min"
              className="w-20 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-orange-500/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !sport.trim() || !duration}
              className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
          <ul className="space-y-1.5">
            {activityLogs.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="group flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 p-2 text-sm"
              >
                <div>
                  <p className="text-neutral-200">{a.sport}</p>
                  <p className="text-xs text-neutral-500">{a.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">{a.durationMin}min</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteActivity(a.id)}
                    className="text-neutral-600 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
            {activityLogs.length === 0 && <li className="text-xs text-neutral-500">No activity logged yet.</li>}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Sleep · 7 days</h3>
            <BarChart data={sleepData} color="#a855f7" />
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Steps · 7 days</h3>
            <BarChart data={stepsData} color="#f97316" />
          </div>
          {weightData.length > 1 && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Weight trend</h3>
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
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-neutral-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-lg font-semibold text-neutral-100">{value}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}
