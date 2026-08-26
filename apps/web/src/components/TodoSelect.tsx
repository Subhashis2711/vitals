"use client";

import type { Todo } from "@vitals/shared";
import { cn } from "@/lib/cn";

export function TodoSelect({
  todos,
  value,
  onChange,
  className,
  placeholder = "No linked todo",
}: {
  todos: Todo[];
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
        "rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-2 text-sm text-neutral-700 dark:text-neutral-300 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20",
        className,
      )}
    >
      <option value="">{placeholder}</option>
      {todos.map((todo) => (
        <option key={todo.id} value={todo.id}>
          {todo.title}
        </option>
      ))}
    </select>
  );
}
