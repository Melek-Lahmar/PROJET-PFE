import { AdminOverviewDashboardPage } from "./pages/AdminOverviewDashboardPage";
import { AdminSalesDashboardPage } from "./pages/AdminSalesDashboardPage";
import { AdminOrdersDashboardPage } from "./pages/AdminOrdersDashboardPage";
import { AdminProductsDashboardPage } from "./pages/AdminProductsDashboardPage";
import { AdminStockDashboardPage } from "./pages/AdminStockDashboardPage";
import { AdminDepotsDashboardPage } from "./pages/AdminDepotsDashboardPage";
import { AdminLogisticsDashboardPage } from "./pages/AdminLogisticsDashboardPage";
import { AdminDriversDashboardPage } from "./pages/AdminDriversDashboardPage";
import { AdminClientsDashboardPage } from "./pages/AdminClientsDashboardPage";
import { AdminReclamationsDashboardPage } from "./pages/AdminReclamationsDashboardPage";
import { AdminSyncDashboardPage } from "./pages/AdminSyncDashboardPage";
import { AdminInsightsDashboardPage } from "./pages/AdminInsightsDashboardPage";

export const adminDashboardRoutes = [
  { path: "admin/dashboard/overview", element: <AdminOverviewDashboardPage /> },
  { path: "admin/dashboard/sales", element: <AdminSalesDashboardPage /> },
  { path: "admin/dashboard/orders", element: <AdminOrdersDashboardPage /> },
  { path: "admin/dashboard/products", element: <AdminProductsDashboardPage /> },
  { path: "admin/dashboard/stock", element: <AdminStockDashboardPage /> },
  { path: "admin/dashboard/depots", element: <AdminDepotsDashboardPage /> },
  { path: "admin/dashboard/logistics", element: <AdminLogisticsDashboardPage /> },
  { path: "admin/dashboard/drivers", element: <AdminDriversDashboardPage /> },
  { path: "admin/dashboard/clients", element: <AdminClientsDashboardPage /> },
  { path: "admin/dashboard/reclamations", element: <AdminReclamationsDashboardPage /> },
  { path: "admin/dashboard/sync", element: <AdminSyncDashboardPage /> },
  { path: "admin/dashboard/insights", element: <AdminInsightsDashboardPage /> },
];
