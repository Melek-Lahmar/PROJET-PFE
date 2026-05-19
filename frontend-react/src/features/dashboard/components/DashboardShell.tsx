import type { ReactNode } from "react";
import "../styles/proDashboard.css";
import type { DashboardFilters } from "../types/dashboard";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";

export function DashboardShell({
  title,
  description,
  generatedAt,
  isFetching,
  filters,
  onFiltersChange,
  onRefresh,
  children,
}: {
  title: string;
  description: string;
  generatedAt?: string;
  isFetching?: boolean;
  filters: DashboardFilters;
  onFiltersChange: (patch: Partial<DashboardFilters>) => void;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <div className="pro-dashboard">
      <DashboardSidebar />
      <main className="pro-main">
        <DashboardTopbar title={title} description={description} generatedAt={generatedAt} isFetching={isFetching} filters={filters} onFiltersChange={onFiltersChange} onRefresh={onRefresh} />
        {children}
      </main>
    </div>
  );
}
