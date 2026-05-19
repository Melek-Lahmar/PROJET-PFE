import { axiosClient } from "../../../core/http/axiosClient";

export type AdminKpi = {
  key: string;
  label: string;
  value: number;
  formattedValue: string;
  previousValue?: number | null;
  deltaPercent?: number | null;
  deltaDirection: "up" | "down" | "flat" | string;
  format: "count" | "currency" | "percent" | string;
};

export type TrendPoint = {
  bucket: string;
  label: string;
  primary: number;
  secondary?: number | null;
};

export type BreakdownItem = {
  key: string;
  label: string;
  count: number;
  percentage: number;
};

export type DashboardOverview = {
  generatedAt: string;
  appliedFilters: {
    period: string;
    from: string;
    to: string;
    governorate?: string | null;
    topN: number;
  };
  kpis: AdminKpi[];
  deliveriesVsReturns: TrendPoint[];
  volumeTrend: TrendPoint[];
  statusBreakdown: BreakdownItem[];
  governorateBreakdown: BreakdownItem[];
};

function camel(raw: any): any {
  if (Array.isArray(raw)) return raw.map(camel);
  if (raw && typeof raw === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      out[k.charAt(0).toLowerCase() + k.slice(1)] = camel(v);
    }
    return out;
  }
  return raw;
}

export async function getDashboardOverview(period: string = "30d"): Promise<DashboardOverview> {
  const { data } = await axiosClient.get("/api/admin/dashboard/overview", { params: { period } });
  return camel(data) as DashboardOverview;
}
