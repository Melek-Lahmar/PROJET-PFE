import { useTranslation } from "react-i18next";
import type { DashboardClientType, DashboardFilters as DashboardFiltersType, DashboardPeriod } from "../types/dashboard";

export function DashboardFilters({ filters, onChange }: { filters: DashboardFiltersType; onChange: (patch: Partial<DashboardFiltersType>) => void }) {
  const { t } = useTranslation("admin");
  return (
    <div className="pro-filters" aria-label="Filtres dashboard">
      <label>
        <span>{t("dashboard.filters.period")}</span>
        <select value={filters.period ?? "30d"} onChange={(e) => onChange({ period: e.target.value as DashboardPeriod })}>
          <option value="7d">{t("dashboard.period.7d")}</option>
          <option value="30d">{t("dashboard.period.30d")}</option>
          <option value="90d">{t("dashboard.period.90d")}</option>
          <option value="12m">{t("dashboard.period.12m")}</option>
          <option value="custom">{t("dashboard.period.custom")}</option>
        </select>
      </label>
      {filters.period === "custom" ? (
        <>
          <label><span>{t("dashboard.filters.from")}</span><input type="date" value={filters.from ?? ""} onChange={(e) => onChange({ from: e.target.value })} /></label>
          <label><span>{t("dashboard.filters.to")}</span><input type="date" value={filters.to ?? ""} onChange={(e) => onChange({ to: e.target.value })} /></label>
        </>
      ) : null}
      <label><span>{t("dashboard.filters.depot")}</span><input inputMode="numeric" placeholder={t("dashboard.filters.all")} value={filters.depotNo ?? ""} onChange={(e) => onChange({ depotNo: e.target.value ? Number(e.target.value) : null })} /></label>
      <label><span>{t("dashboard.filters.governorate")}</span><input placeholder="Sfax" value={filters.governorate ?? ""} onChange={(e) => onChange({ governorate: e.target.value || null })} /></label>
      <label><span>{t("dashboard.filters.clientType")}</span><select value={filters.clientType ?? "ALL"} onChange={(e) => onChange({ clientType: e.target.value as DashboardClientType })}><option value="ALL">ALL</option><option value="B2B">B2B</option><option value="B2C">B2C</option></select></label>
      <label><span>{t("dashboard.filters.top")}</span><select value={filters.top ?? 10} onChange={(e) => onChange({ top: Number(e.target.value) })}><option value={5}>5</option><option value={10}>10</option><option value={15}>15</option></select></label>
    </div>
  );
}
