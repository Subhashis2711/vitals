"use client";

import type { LearningTopic } from "@vitals/shared";
import { cn } from "@/lib/cn";

export function TopicSelect({
  topics,
  value,
  onChange,
  className,
  placeholder = "No topic",
}: {
  topics: LearningTopic[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm text-neutral-300 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20",
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {topics.map((topic) => (
        <option key={topic.id} value={topic.id}>
          {topic.title}
        </option>
      ))}
    </select>
  );
}
