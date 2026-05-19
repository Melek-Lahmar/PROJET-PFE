import type { ChartPoint } from "../types/dashboard";

export function MetricTrend({ data }: { data: ChartPoint[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((p) => p.value), 1);
  return (
    <div className="pro-microtrend" aria-hidden="true">
      {data.slice(-12).map((point) => (
        <span key={point.key} style={{ height: `${Math.max(8, (point.value / max) * 42)}px` }} title={`${point.label}: ${point.value}`} />
      ))}
    </div>
  );
}
