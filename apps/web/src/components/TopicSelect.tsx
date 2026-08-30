"use client";

import type { LearningTopic } from "@vitals/shared";
import { cn } from "@/lib/cn";
import { fieldSelectClass } from "@/lib/fieldStyles";

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
      className={cn(fieldSelectClass, className)}
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
