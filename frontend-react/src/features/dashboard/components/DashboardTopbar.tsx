import { useTranslation } from "react-i18next";
import { ThemeToggle } from "../../../shared/components/ThemeToggle";
import { LanguageSwitcher } from "../../../shared/components/LanguageSwitcher";
import type { DashboardFilters as DashboardFiltersType } from "../types/dashboard";
import { DashboardFilters } from "./DashboardFilters";

export function DashboardTopbar({
  title,
  description,
  generatedAt,
  isFetching,
  filters,
  onFiltersChange,
  onRefresh,
}: {
  title: string;
  description: string;
  generatedAt?: string;
  isFetching?: boolean;
  filters: DashboardFiltersType;
  onFiltersChange: (patch: Partial<DashboardFiltersType>) => void;
  onRefresh: () => void;
}) {
  const { t } = useTranslation("admin");
  const formattedDate = generatedAt ? new Date(generatedAt).toLocaleString() : t("dashboard.meta.notAvailable");
  return (
    <header className="pro-topbar">
      <div className="pro-topbar__header">
        <div className="pro-topbar__headline">
          <span>{t("dashboard.meta.cockpit")}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="pro-topbar__actions">
          <div className="pro-updated">
            <span>{t("dashboard.meta.updatedAt")}</span>
            <strong>{formattedDate}</strong>
          </div>
          <button type="button" className="pro-refresh" onClick={onRefresh} disabled={isFetching} aria-label={isFetching ? t("dashboard.actions.refreshing") : t("dashboard.actions.refresh")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 11a8 8 0 0 0-14.9-4" />
              <path d="M4 5v5h5" />
              <path d="M4 13a8 8 0 0 0 14.9 4" />
              <path d="M20 19v-5h-5" />
            </svg>
            <span>{isFetching ? t("dashboard.actions.refreshing") : t("dashboard.actions.refresh")}</span>
          </button>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
      <DashboardFilters filters={filters} onChange={onFiltersChange} />
    </header>
  );
}
