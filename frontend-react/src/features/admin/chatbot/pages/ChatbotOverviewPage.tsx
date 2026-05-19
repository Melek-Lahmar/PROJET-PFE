import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getStats } from "../api/chatbotApi";

const ACTION_COLORS: Record<string, string> = {
  query: "#3b82f6",
  analyze: "#8b5cf6",
  predict: "#ec4899",
  kb: "#14b8a6",
  chitchat: "#f59e0b",
  action: "#10b981",
  error: "#ef4444",
};
const FALLBACK_COLOR = "#94a3b8";

function Kpi({ label, value, hint, color }: { label: string; value: string | number; hint?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight text-card-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ChatbotOverviewPage() {
  const { data: stats, isPending, isError } = useQuery({
    queryKey: ["chatbot-stats"],
    queryFn: getStats,
    refetchInterval: 60_000,
  });

  const totalFeedback = (stats?.feedbackUp ?? 0) + (stats?.feedbackDown ?? 0);
  const satisfactionPct = totalFeedback > 0 ? Math.round((100 * (stats?.feedbackUp ?? 0)) / totalFeedback) : null;

  const actionData = (stats?.byAction ?? []).map((b) => ({
    ...b,
    color: ACTION_COLORS[b.action] ?? FALLBACK_COLOR,
  }));

  return (
    <div className="container-app space-y-6 py-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-violet-500/10 via-card to-card p-6 shadow-sm">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="4" y="8" width="16" height="12" rx="3" />
                  <circle cx="9" cy="14" r="1" fill="currentColor" />
                  <circle cx="15" cy="14" r="1" fill="currentColor" />
                  <path d="M12 8V4" />
                </svg>
              </span>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Chatbot admin</div>
                <h1 className="text-3xl font-black tracking-tight text-card-foreground">Vue d'ensemble</h1>
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Activité globale du chatbot intelligent (orchestrator V2 — LLM Groq + ML.NET + KB métier).
              Refresh automatique chaque minute.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/chatbot/sandbox" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-700">
              🧪 Sandbox
            </Link>
            <Link to="/admin/chatbot/conversations" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-bold transition hover:border-violet-300">
              💬 Conversations
            </Link>
            <Link to="/admin/chatbot/insights" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-bold transition hover:border-violet-300">
              💡 Insights
            </Link>
          </div>
        </div>
      </section>

      {isPending ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-muted/30" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Impossible de charger les statistiques chatbot.
        </div>
      ) : !stats ? null : (
        <>
          {/* KPI */}
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Kpi label="Sessions totales" value={stats.totalSessions} color="#3b82f6" />
            <Kpi label="Messages totaux" value={stats.totalMessages} color="#8b5cf6" />
            <Kpi label="Sessions 24h" value={stats.sessions24h} hint="actives sur 24h glissantes" color="#10b981" />
            <Kpi
              label="Satisfaction"
              value={satisfactionPct !== null ? `${satisfactionPct}%` : "—"}
              hint={`${stats.feedbackUp} 👍 / ${stats.feedbackDown} 👎`}
              color="#ec4899"
            />
            <Kpi label="Types d'actions" value={stats.byAction.length} hint="catégories distinctes" color="#f59e0b" />
          </section>

          {/* Charts */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <header className="mb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Répartition</div>
                <h3 className="text-lg font-black text-card-foreground">Actions traitées</h3>
              </header>
              <div className="h-72 w-full">
                {actionData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune action.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={actionData} dataKey="count" nameKey="action" cx="50%" cy="50%" innerRadius={56} outerRadius={100} paddingAngle={2}>
                        {actionData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <header className="mb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Volume</div>
                <h3 className="text-lg font-black text-card-foreground">Top actions</h3>
              </header>
              <div className="h-72 w-full">
                {actionData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune action.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={actionData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="action" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {actionData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          {/* Liens rapides */}
          <section className="grid gap-3 md:grid-cols-3">
            <Link to="/admin/chatbot/sandbox" className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-violet-50 to-card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-xs font-bold uppercase text-violet-600">Sandbox</div>
              <div className="mt-2 text-lg font-black">Tester une question</div>
              <p className="mt-1 text-xs text-muted-foreground">Posez une question sans persistance + voir l'action retenue.</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-700">Ouvrir →</div>
            </Link>
            <Link to="/admin/chatbot/conversations" className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-blue-50 to-card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-xs font-bold uppercase text-blue-600">Conversations</div>
              <div className="mt-2 text-lg font-black">Voir l'historique</div>
              <p className="mt-1 text-xs text-muted-foreground">Sessions et messages échangés. Lecture seule.</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700">Ouvrir →</div>
            </Link>
            <Link to="/admin/chatbot/insights" className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-amber-50 to-card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-xs font-bold uppercase text-amber-600">Insights</div>
              <div className="mt-2 text-lg font-black">Alertes proactives</div>
              <p className="mt-1 text-xs text-muted-foreground">Insights pré-calculés par le job Hangfire.</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700">Ouvrir →</div>
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
