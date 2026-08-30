"use client";

import type { Habit } from "@vitals/shared";
import { Check, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HabitFrequencyPicker } from "@/components/HabitFrequencyPicker";
import { updateHabit } from "@/lib/api-browser";
import { cn } from "@/lib/cn";
import { fieldInputClass } from "@/lib/fieldStyles";
import { modalCloseButtonClass, modalDeleteButtonClass, modalSaveButtonClass } from "@/lib/modalIconButton";

const COLOR_OPTIONS = ["#a3a3a3", "#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#eab308"];

export function HabitDetailModal({
  habit,
  onClose,
  onChange,
  onDelete,
}: {
  habit: Habit;
  onClose: () => void;
  onChange: (habit: Habit) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [name, setName] = useState(habit.name);
  const [description, setDescription] = useState(habit.description ?? "");
  const [frequency, setFrequency] = useState(habit.frequency);
  const [daysOfWeek, setDaysOfWeek] = useState(habit.daysOfWeek);
  const [color, setColor] = useState(habit.color ?? COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const dirty =
    name.trim() !== habit.name ||
    description.trim() !== (habit.description ?? "") ||
    frequency !== habit.frequency ||
    JSON.stringify(daysOfWeek) !== JSON.stringify(habit.daysOfWeek) ||
    color !== (habit.color ?? COLOR_OPTIONS[0]);

  async function handleSave() {
    if (!name.trim() || !dirty) return;
    setSaving(true);
    try {
      const { habit: updated } = await updateHabit(habit.id, {
        name: name.trim(),
        description: description.trim() || null,
        frequency,
        daysOfWeek,
        color,
      });
      onChange(updated);
      toast.success("Habit saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update habit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-16 sm:pt-24" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onDelete(habit.id, habit.name);
              onClose();
            }}
            title="Delete habit"
            className={modalDeleteButtonClass}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty || !name.trim()}
              title="Save"
              className={modalSaveButtonClass(dirty && Boolean(name.trim()))}
            >
              <Check className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} title="Close" className={modalCloseButtonClass}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldInputClass}
          />

          <label className="block text-xs text-neutral-600 dark:text-neutral-500">
            Frequency
            <div className="mt-1">
              <HabitFrequencyPicker
                frequency={frequency}
                daysOfWeek={daysOfWeek}
                onChange={(f, d) => {
                  setFrequency(f);
                  setDaysOfWeek(d);
                }}
              />
            </div>
          </label>

          <label className="block text-xs text-neutral-600 dark:text-neutral-500">
            Color
            <div className="mt-1 flex gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-colors",
                    color === c ? "border-neutral-900 dark:border-neutral-100" : "border-transparent",
                  )}
                />
              ))}
            </div>
          </label>

          <label className="block text-xs text-neutral-600 dark:text-neutral-500">
            Notes
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional details..."
              className={cn("mt-1", fieldInputClass)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
