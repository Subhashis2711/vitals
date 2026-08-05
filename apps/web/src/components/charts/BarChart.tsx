export function BarChart({
  data,
  height = 80,
  color = "#f97316",
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const barHeight = d.value > 0 ? Math.max((d.value / max) * height, 4) : 0;
          return (
            <div key={i} className="flex h-full flex-1 flex-col justify-end">
              <div className="w-full rounded-t transition-all" style={{ height: barHeight, backgroundColor: color }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[9px] text-neutral-600">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
