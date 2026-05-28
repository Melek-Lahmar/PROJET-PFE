import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { EmptyView, PremiumHero } from "../../../shared/components/premium";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { me } from "../../auth/api/authApi";
import { listMyQuotes } from "../api/b2bQuotesApi";

function money(value: number) {
  return `${Number(value ?? 0).toFixed(3)} TND`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("fr-FR");
}

function statusClass(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  if (s === "ACCEPTE_CLIENT" || s === "CONVERTI_BC" || s === "VALIDE") return "badge-success";
  if (s === "SOUMIS" || s === "EN_ETUDE" || s === "ENVOYE_CLIENT" || s === "REPONSE_CLIENT") return "badge-info";
  if (s === "REFUSE_CLIENT" || s === "ANNULE" || s === "EXPIRE") return "badge-danger";
  return "badge-warning";
}

function statusLabel(status?: string | null) {
  const s = (status ?? "").toUpperCase();
  const labels: Record<string, string> = {
    BROUILLON: "Brouillon",
    SOUMIS: "Soumis",
    EN_ETUDE: "En étude",
    INFO_MANQUANTE: "Info manquante",
    REPONSE_CLIENT: "Réponse client",
    MODIFIE: "Modifié",
    VALIDE: "Validé",
    ENVOYE_CLIENT: "Envoyé au client",
    ACCEPTE_CLIENT: "Accepté",
    REFUSE_CLIENT: "Refusé",
    EXPIRE: "Expiré",
    CONVERTI_BC: "Converti en BC",
    ANNULE: "Annulé",
  };
  return labels[s] ?? s;
}

export function MyB2BQuotesPage() {
  const meQuery = useQuery({ queryKey: ["me"], queryFn: me });
  const isB2B = meQuery.data?.profile?.typeClient === 1;

  const quotesQuery = useQuery({
    queryKey: ["my-b2b-quotes"],
    queryFn: listMyQuotes,
    enabled: isB2B,
  });

  if (meQuery.isLoading) return <div className="py-10 text-sm text-muted-foreground">Chargement...</div>;

  if (!isB2B) {
    return (
      <EmptyView
        title="Espace réservé aux clients professionnels"
        description="Les devis commerciaux sont réservés aux clients professionnels B2B."
        iconPath="M3 21h18 M6 21V7l6-4 6 4v14 M9 10h.01 M15 10h.01 M9 14h.01 M15 14h.01"
      />
    );
  }

  const quotes = quotesQuery.data ?? [];

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Compte B2B"
        title="Mes devis"
        description="Consultez vos demandes et propositions commerciales, puis acceptez ou refusez les devis envoyés par l'équipe confirmateur."
      />

      {quotesQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement des devis...</div>
      ) : quotesQuery.isError ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 text-sm text-rose-700">{getApiErrorMessage(quotesQuery.error)}</div>
      ) : quotes.length === 0 ? (
        <EmptyView
          title="Aucun devis pour le moment"
          description="Vos devis professionnels envoyés apparaîtront ici."
          iconPath="M6 2h9l5 5v15H6z M14 2v6h6 M9 13h6 M9 17h8"
          action={<Link to="/articles"><Button type="button" variant="primary">Découvrir le catalogue</Button></Link>}
        />
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <article key={quote.piece} className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-black">{quote.piece}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(quote.quoteStatus)}`}>{statusLabel(quote.quoteStatus)}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">Valide jusqu'au {formatDate(quote.validUntil)}</div>
                </div>
                <div className="text-left lg:text-right">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Net à payer</div>
                  <div className="mt-1 text-2xl font-black text-primary">{money(quote.netAPayer)}</div>
                  {quote.b2bDiscountAmount > 0 ? (
                    <div className="text-xs text-muted-foreground">Remise : -{money(quote.b2bDiscountAmount)}</div>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/b2b/devis/${encodeURIComponent(quote.piece)}`}>
                  <Button type="button" variant="primary">Consulter</Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
