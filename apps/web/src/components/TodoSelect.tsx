"use client";

import type { Todo } from "@vitals/shared";
import { cn } from "@/lib/cn";
import { fieldSelectClass } from "@/lib/fieldStyles";

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
      className={cn(fieldSelectClass, className)}
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
