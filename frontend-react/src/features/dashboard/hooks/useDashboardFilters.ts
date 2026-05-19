import { useMemo, useState } from "react";
import type { DashboardFilters } from "../types/dashboard";

export function useDashboardFilters(initial?: DashboardFilters) {
  const [filters, setFilters] = useState<DashboardFilters>({ period: "30d", clientType: "ALL", top: 10, ...initial });

  const queryKey = useMemo(() => JSON.stringify(filters), [filters]);

  function patchFilters(patch: Partial<DashboardFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function resetFilters() {
    setFilters({ period: "30d", clientType: "ALL", top: 10 });
  }

  return { filters, setFilters, patchFilters, resetFilters, queryKey };
}
