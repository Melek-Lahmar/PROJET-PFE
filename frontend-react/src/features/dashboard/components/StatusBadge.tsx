import type { DashboardSeverity } from "../types/dashboard";

export function StatusBadge({ label, severity = "info" }: { label: string; severity?: DashboardSeverity | string | null }) {
  return <span className={`pro-status pro-status--${severity || "info"}`}>{label}</span>;
}
