import axios from "axios";
import { axiosClient } from "../../../core/http/axiosClient";
import type {
  DashboardFilters,
  DashboardPageKey,
  DashboardPageResponse,
  OverviewDashboardResponse,
  SalesDashboardResponse,
  OrdersDashboardResponse,
  ProductsDashboardResponse,
  StockDashboardResponse,
  DepotsDashboardResponse,
  LogisticsDashboardResponse,
  DriversDashboardResponse,
  ClientsDashboardResponse,
  ReclamationsDashboardResponse,
  SyncDashboardResponse,
  InsightsDashboardResponse,
} from "../types/dashboard";

const BASE = "/api/dashboard";

function params(filters: DashboardFilters = {}) {
  return {
    period: filters.period ?? "30d",
    from: filters.from || undefined,
    to: filters.to || undefined,
    depotNo: filters.depotNo ?? undefined,
    governorate: filters.governorate || undefined,
    delegation: filters.delegation || undefined,
    clientType: filters.clientType ?? "ALL",
    orderStatus: filters.orderStatus || undefined,
    deliveryStatus: filters.deliveryStatus || undefined,
    top: filters.top ?? 10,
  };
}

function buildError(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error : new Error(fallback);
  const payload = error.response?.data;
  const message =
    typeof payload === "string"
      ? payload
      : payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message ?? fallback)
        : error.message;
  return new Error(message || fallback);
}

async function getDashboard<T extends DashboardPageResponse>(section: DashboardPageKey, filters: DashboardFilters = {}): Promise<T> {
  try {
    const { data } = await axiosClient.get<T>(`${BASE}/${section}`, { params: params(filters) });
    return data;
  } catch (error) {
    throw buildError(error, "Impossible de charger les données du dashboard.");
  }
}

export const getOverviewDashboard = (filters?: DashboardFilters) => getDashboard<OverviewDashboardResponse>("overview", filters);
export const getSalesDashboard = (filters?: DashboardFilters) => getDashboard<SalesDashboardResponse>("sales", filters);
export const getOrdersDashboard = (filters?: DashboardFilters) => getDashboard<OrdersDashboardResponse>("orders", filters);
export const getProductsDashboard = (filters?: DashboardFilters) => getDashboard<ProductsDashboardResponse>("products", filters);
export const getStockDashboard = (filters?: DashboardFilters) => getDashboard<StockDashboardResponse>("stock", filters);
export const getDepotsDashboard = (filters?: DashboardFilters) => getDashboard<DepotsDashboardResponse>("depots", filters);
export const getLogisticsDashboard = (filters?: DashboardFilters) => getDashboard<LogisticsDashboardResponse>("logistics", filters);
export const getDriversDashboard = (filters?: DashboardFilters) => getDashboard<DriversDashboardResponse>("drivers", filters);
export const getClientsDashboard = (filters?: DashboardFilters) => getDashboard<ClientsDashboardResponse>("clients", filters);
export const getReclamationsDashboard = (filters?: DashboardFilters) => getDashboard<ReclamationsDashboardResponse>("reclamations", filters);
export const getSyncDashboard = (filters?: DashboardFilters) => getDashboard<SyncDashboardResponse>("sync", filters);
export const getInsightsDashboard = (filters?: DashboardFilters) => getDashboard<InsightsDashboardResponse>("insights", filters);

export const dashboardApiByPage = {
  overview: getOverviewDashboard,
  sales: getSalesDashboard,
  orders: getOrdersDashboard,
  products: getProductsDashboard,
  stock: getStockDashboard,
  depots: getDepotsDashboard,
  logistics: getLogisticsDashboard,
  drivers: getDriversDashboard,
  clients: getClientsDashboard,
  reclamations: getReclamationsDashboard,
  sync: getSyncDashboard,
  insights: getInsightsDashboard,
} satisfies Record<DashboardPageKey, (filters?: DashboardFilters) => Promise<DashboardPageResponse>>;
