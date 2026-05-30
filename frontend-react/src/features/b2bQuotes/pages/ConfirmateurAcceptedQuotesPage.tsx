import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { EmptyView, PremiumHero } from "../../../shared/components/premium";
import { useToast } from "../../../shared/components/premium/Toast";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { convertQuoteToOrder, listQuotes } from "../api/b2bQuotesApi";

function money(value: number) {
  return `${Number(value ?? 0).toFixed(3)} TND`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("fr-FR");
}

export function ConfirmateurAcceptedQuotesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const quotesQuery = useQuery({
    queryKey: ["b2b-quotes", "ACCEPTED", "confirmateur"],
    queryFn: () => listQuotes({ status: "ACCEPTED" }),
  });

  const convertMutation = useMutation({
    mutationFn: convertQuoteToOrder,
    onSuccess: async (res) => {
      toast.success("BC créé", res.piece);
      await qc.invalidateQueries({ queryKey: ["b2b-quotes"] });
    },
    onError: (err) => toast.error("Conversion impossible", getApiErrorMessage(err)),
  });

  const quotes = quotesQuery.data ?? [];

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Confirmateur"
        title="Devis B2B acceptés"
        description="Convertissez les devis acceptés par les clients professionnels en bons de commande."
      />

      {quotesQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement des devis acceptés...</div>
      ) : quotesQuery.isError ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">{getApiErrorMessage(quotesQuery.error)}</div>
      ) : quotes.length === 0 ? (
        <EmptyView
          title="Aucun devis accepté"
          description="Les devis B2B acceptés par les clients apparaîtront ici pour conversion."
          iconPath="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
        />
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <article key={quote.piece} className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="font-mono text-lg font-black">{quote.piece}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {quote.companyName || quote.clientName || quote.clientPhone || "-"} · validité {formatDate(quote.validUntil)}
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Net à payer</div>
                  <div className="mt-1 text-2xl font-black text-primary">{money(quote.netAPayer)}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/confirmateur/devis/${encodeURIComponent(quote.piece)}`}>
                  <Button type="button" variant="outline">Voir détail</Button>
                </Link>
                <Button type="button" variant="primary" onClick={() => convertMutation.mutate(quote.piece)}>
                  Convertir en commande
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
