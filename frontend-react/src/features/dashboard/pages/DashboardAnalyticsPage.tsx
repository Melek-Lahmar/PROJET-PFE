import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSyncAll, useSyncArticles, useSyncCatalogues, useSyncDepots, useSyncStocks } from "../../admin/hooks/useSageSync";
import { dashboardApiByPage } from "../api/dashboardApi";
import { AlertPanel } from "../components/AlertPanel";
import { ChartCard } from "../components/ChartCard";
import { DashboardShell } from "../components/DashboardShell";
import { DataTableCard } from "../components/DataTableCard";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { InsightCard } from "../components/InsightCard";
import { KpiCard } from "../components/KpiCard";
import { LoadingState } from "../components/LoadingState";
import { PowerBiGrid } from "../components/PowerBiGrid";
import { StatusBadge } from "../components/StatusBadge";
import { useDashboardFilters } from "../hooks/useDashboardFilters";
import type { DashboardPageKey, DashboardPageResponse } from "../types/dashboard";

const chartColors = ["var(--dashboard-primary)", "var(--dashboard-success)", "var(--dashboard-warning)", "var(--dashboard-danger)", "var(--dashboard-info)", "var(--dashboard-violet)"];

function LineArea({ data, secondary = false }: { data: DashboardPageResponse["primaryTrend"]; secondary?: boolean }) {
  if (!data.length) return <EmptyState title="Aucune tendance" description="Les données de tendance ne sont pas disponibles pour cette période." />;
  return (
    <ResponsiveContainer width="100%" height={290}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="var(--dashboard-chart-grid)" strokeDasharray="4 4" />
        <XAxis dataKey="label" tick={{ fill: "var(--dashboard-muted)", fontSize: 12 }} />
        <YAxis tick={{ fill: "var(--dashboard-muted)", fontSize: 12 }} />
        <Tooltip contentStyle={{ background: "var(--dashboard-surface)", border: "1px solid var(--dashboard-border)", borderRadius: 14 }} />
        <Area type="monotone" dataKey="value" name="Valeur" stroke="var(--dashboard-primary)" fill="var(--dashboard-primary-soft)" strokeWidth={2.4} />
        {secondary ? <Area type="monotone" dataKey="secondaryValue" name="Secondaire" stroke="var(--dashboard-success)" fill="var(--dashboard-success-soft)" strokeWidth={2.2} /> : null}
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BarTop({ data }: { data: DashboardPageResponse["topEntities"] }) {
  if (!data.length) return <EmptyState title="Aucun classement" description="Aucun top élément à afficher." />;
  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 18, left: 14, bottom: 0 }}>
        <CartesianGrid stroke="var(--dashboard-chart-grid)" strokeDasharray="4 4" />
        <XAxis type="number" tick={{ fill: "var(--dashboard-muted)", fontSize: 12 }} />
        <YAxis type="category" width={120} dataKey="label" tick={{ fill: "var(--dashboard-muted)", fontSize: 12 }} />
        <Tooltip contentStyle={{ background: "var(--dashboard-surface)", border: "1px solid var(--dashboard-border)", borderRadius: 14 }} />
        <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="var(--dashboard-primary)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Donut({ data }: { data: DashboardPageResponse["statusDistribution"] }) {
  if (!data.length) return <EmptyState title="Aucune répartition" description="Aucun statut disponible." />;
  return (
    <div className="pro-donut-layout">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" innerRadius={62} outerRadius={95} paddingAngle={4}>
            {data.map((entry, index) => <Cell key={entry.key} fill={chartColors[index % chartColors.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "var(--dashboard-surface)", border: "1px solid var(--dashboard-border)", borderRadius: 14 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pro-donut-legend">
        {data.map((item) => <div key={item.key}><StatusBadge label={`${item.label} — ${item.percentage.toFixed(1)}%`} severity={item.severity || "info"} /><span>{item.count}</span></div>)}
      </div>
    </div>
  );
}

function SyncRealtimePanel({ isRefreshing, onSynced }: { isRefreshing?: boolean; onSynced: () => void }) {
  const articles = useSyncArticles();
  const catalogues = useSyncCatalogues();
  const depots = useSyncDepots();
  const stocks = useSyncStocks();
  const all = useSyncAll();
  const isSyncing = articles.isPending || catalogues.isPending || depots.isPending || stocks.isPending || all.isPending;

  return (
    <section className="pro-sync-live">
      <div className="pro-sync-live__status">
        <span className={isSyncing || isRefreshing ? "is-active" : ""} />
        <div>
          <strong>{isSyncing ? "Synchronisation en cours" : "Temps réel actif"}</strong>
          <p>{isRefreshing ? "Recalcul des courbes en cours." : "Lecture automatique des dernières données Sage X3 locales."}</p>
        </div>
      </div>
      <div className="pro-sync-live__actions">
        <button type="button" onClick={() => articles.mutate(undefined, { onSuccess: onSynced })} disabled={isSyncing}>Articles</button>
        <button type="button" onClick={() => catalogues.mutate(undefined, { onSuccess: onSynced })} disabled={isSyncing}>Catalogues</button>
        <button type="button" onClick={() => depots.mutate(undefined, { onSuccess: onSynced })} disabled={isSyncing}>Dépôts</button>
        <button type="button" onClick={() => stocks.mutate(undefined, { onSuccess: onSynced })} disabled={isSyncing}>Stocks</button>
        <button type="button" className="is-primary" onClick={() => all.mutate(undefined, { onSuccess: onSynced })} disabled={isSyncing}>Synchroniser tout</button>
      </div>
    </section>
  );
}

export function DashboardAnalyticsPage({ pageKey }: { pageKey: DashboardPageKey }) {
  const { t } = useTranslation("admin");
  const { filters, patchFilters, queryKey } = useDashboardFilters();
  const query = useQuery({
    queryKey: ["pro-dashboard", pageKey, queryKey],
    queryFn: () => dashboardApiByPage[pageKey](filters),
    refetchInterval: pageKey === "sync" ? 5000 : undefined,
    refetchIntervalInBackground: pageKey === "sync",
    staleTime: pageKey === "sync" ? 0 : 30_000,
  });
  const data = query.data;

  return (
    <DashboardShell
      title={data?.title || t(`dashboard.pages.${pageKey}.title`)}
      description={data?.description || t(`dashboard.pages.${pageKey}.description`)}
      generatedAt={data?.generatedAt}
      isFetching={query.isFetching}
      filters={filters}
      onFiltersChange={patchFilters}
      onRefresh={() => query.refetch()}
    >
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState title={t("dashboard.errors.title")} description={(query.error as Error)?.message || t("dashboard.errors.description")} onRetry={() => query.refetch()} /> : null}
      {!query.isLoading && !query.isError && !data ? <EmptyState title={t("dashboard.empty.title")} description={t("dashboard.empty.description")} /> : null}
      {data ? (
        <div className="pro-content-stack">
          {data.executiveSummary ? (
            <section className={`pro-executive pro-executive--${data.executiveSummary.status}`}>
              <div><span>{t("dashboard.meta.executiveSummary")}</span><h2>{data.executiveSummary.title}</h2><p>{data.executiveSummary.description}</p></div>
              <ul>{data.executiveSummary.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
            </section>
          ) : null}
          {data.warnings.length ? <div className="pro-warning-strip">{data.warnings.map((w) => <span key={w}>{w}</span>)}</div> : null}
          {pageKey === "sync" ? <SyncRealtimePanel isRefreshing={query.isFetching} onSynced={() => void query.refetch()} /> : null}
          <section className="pro-section">
            <div className="pro-section-heading">
              <span>01</span>
              <div>
                <h2>Synthèse opérationnelle</h2>
                <p>Indicateurs clés issus de l'API dashboard, sans données statiques de remplacement.</p>
              </div>
            </div>
            <div className="pro-kpi-grid">{data.kpis.map((metric) => <KpiCard key={metric.key} metric={metric} />)}</div>
          </section>
          <section className="pro-section">
            <div className="pro-section-heading">
              <span>02</span>
              <div>
                <h2>Analyse détaillée</h2>
                <p>Tendances, répartitions et classements métier pour piloter les priorités.</p>
              </div>
            </div>
            <PowerBiGrid>
              <ChartCard title={t("dashboard.charts.primaryTrend")} description={data.dataCompletenessNote}><LineArea data={data.primaryTrend} secondary /></ChartCard>
              <ChartCard title={t("dashboard.charts.statusDistribution")}><Donut data={data.statusDistribution} /></ChartCard>
              <ChartCard title={t("dashboard.charts.topEntities")}><BarTop data={data.topEntities} /></ChartCard>
              <ChartCard title={t("dashboard.charts.secondaryTrend")}><LineArea data={data.secondaryTrend} /></ChartCard>
            </PowerBiGrid>
          </section>
          <section className="pro-section">
            <div className="pro-section-heading">
              <span>03</span>
              <div>
                <h2>Insights métier</h2>
                <p>Signaux faibles et recommandations calculés côté backend.</p>
              </div>
            </div>
            {data.insights.length ? <div className="pro-insights-grid">{data.insights.map((insight) => <InsightCard key={insight.key} insight={insight} />)}</div> : <EmptyState title="Aucun insight" description="Aucune recommandation n'est disponible avec les filtres actuels." />}
          </section>
          <section className="pro-section">
            <div className="pro-section-heading">
              <span>04</span>
              <div>
                <h2>Pilotage opérationnel</h2>
                <p>Alertes prioritaires et lignes récentes retournées par le backend.</p>
              </div>
            </div>
            <div className="pro-bottom-grid"><AlertPanel alerts={data.alerts} title={t("dashboard.sections.alerts")} /><DataTableCard table={data.table} /></div>
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}
