import { useQuery } from "@tanstack/react-query";
import { listInsights } from "../api/chatbotApi";
import { PremiumHero, EmptyView } from "../../../../shared/components/premium";

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-sky-50 text-sky-700 ring-sky-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  critical: "bg-rose-50 text-rose-700 ring-rose-100",
};

export function ChatbotInsightsPage() {
  const { data, isPending } = useQuery({ queryKey: ["chatbot-insights"], queryFn: () => listInsights(100) });

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Chatbot admin"
        title="Insights proactifs"
        description="Alertes pré-calculées par le job Hangfire (anomalies de commandes, pics de réclamations, etc.)."
      />

      {isPending ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : (data ?? []).length === 0 ? (
        <EmptyView title="Aucun insight" description="Le job n'a encore rien remonté." iconPath="M12 2v4 M12 18v4 M2 12h4 M18 12h4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M16.24 7.76l2.83-2.83 M4.93 19.07l2.83-2.83" />
      ) : (
        <div className="grid gap-3">
          {(data ?? []).map((i) => (
            <article key={i.id} className="app-surface p-4">
              <div className="flex items-start gap-3">
                <span className={[
                  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ring-1",
                  SEVERITY_STYLES[i.severity] ?? SEVERITY_STYLES.info,
                ].join(" ")}>
                  {i.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{i.title}</strong>
                    <span className="text-xs text-muted-foreground">{new Date(i.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{i.message}</p>
                  <div className="mt-1 text-[11px] text-muted-foreground/70">type: {i.type}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
