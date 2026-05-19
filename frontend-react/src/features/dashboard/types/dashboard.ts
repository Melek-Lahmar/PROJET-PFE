export type DashboardPeriod = "7d" | "30d" | "90d" | "12m" | "custom";
export type DashboardClientType = "ALL" | "B2B" | "B2C";
export type DashboardSeverity = "success" | "info" | "warning" | "critical";

export type DashboardFilters = {
  period?: DashboardPeriod;
  from?: string;
  to?: string;
  depotNo?: number | null;
  governorate?: string | null;
  delegation?: string | null;
  clientType?: DashboardClientType;
  orderStatus?: string | null;
  deliveryStatus?: string | null;
  top?: number;
};

export type DashboardAppliedFilters = Required<Pick<DashboardFilters, "period" | "clientType" | "top">> & {
  from?: string | null;
  to?: string | null;
  depotNo?: number | null;
  governorate?: string | null;
  delegation?: string | null;
  orderStatus?: string | null;
  deliveryStatus?: string | null;
};

export type KpiMetric = {
  key: string;
  label: string;
  value: number;
  formattedValue: string;
  delta?: number | null;
  deltaFormatted?: string | null;
  deltaDirection?: "up" | "down" | "flat" | string;
  format?: "count" | "currency" | "percent" | "days" | "quantity" | string;
  hint?: string | null;
  severity?: DashboardSeverity | string | null;
};

export type ChartPoint = {
  key: string;
  label: string;
  value: number;
  secondaryValue?: number | null;
};

export type StatusDistributionItem = {
  key: string;
  label: string;
  count: number;
  percentage: number;
  severity?: DashboardSeverity | string | null;
};

export type TopEntityItem = {
  key: string;
  label: string;
  secondaryLabel?: string | null;
  value: number;
  formattedValue: string;
  meta?: string | null;
  severity?: DashboardSeverity | string | null;
};

export type DashboardAlert = {
  key: string;
  title: string;
  description: string;
  severity: DashboardSeverity | string;
  module?: string | null;
  action?: string | null;
  count?: number | null;
};

export type DashboardInsight = {
  key: string;
  title: string;
  description: string;
  impact?: string | null;
  action?: string | null;
  severity: DashboardSeverity | string;
};

export type DataTableColumn = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
};

export type DataTableRow = Record<string, string | number | null | undefined> & {
  key: string;
};

export type DashboardTable = {
  title: string;
  description?: string | null;
  columns: DataTableColumn[];
  rows: DataTableRow[];
};

export type DashboardExecutiveSummary = {
  title: string;
  description: string;
  status: DashboardSeverity | string;
  highlights: string[];
};

export type DashboardPageResponse = {
  generatedAt: string;
  scope: string;
  title: string;
  description: string;
  appliedFilters: DashboardAppliedFilters;
  executiveSummary?: DashboardExecutiveSummary | null;
  kpis: KpiMetric[];
  primaryTrend: ChartPoint[];
  secondaryTrend: ChartPoint[];
  statusDistribution: StatusDistributionItem[];
  secondaryDistribution: StatusDistributionItem[];
  topEntities: TopEntityItem[];
  secondaryTopEntities: TopEntityItem[];
  alerts: DashboardAlert[];
  insights: DashboardInsight[];
  table: DashboardTable;
  warnings: string[];
  dataCompletenessNote?: string | null;
};

export type OverviewDashboardResponse = DashboardPageResponse;
export type SalesDashboardResponse = DashboardPageResponse;
export type OrdersDashboardResponse = DashboardPageResponse;
export type ProductsDashboardResponse = DashboardPageResponse;
export type StockDashboardResponse = DashboardPageResponse;
export type DepotsDashboardResponse = DashboardPageResponse;
export type LogisticsDashboardResponse = DashboardPageResponse;
export type DriversDashboardResponse = DashboardPageResponse;
export type ClientsDashboardResponse = DashboardPageResponse;
export type ReclamationsDashboardResponse = DashboardPageResponse;
export type SyncDashboardResponse = DashboardPageResponse;
export type InsightsDashboardResponse = DashboardPageResponse;

export type DashboardPageKey =
  | "overview"
  | "sales"
  | "orders"
  | "products"
  | "stock"
  | "depots"
  | "logistics"
  | "drivers"
  | "clients"
  | "reclamations"
  | "sync"
  | "insights";
