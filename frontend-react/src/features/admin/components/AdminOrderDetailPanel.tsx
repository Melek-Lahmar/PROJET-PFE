import type { AdminOrderDetail } from "../types/adminBackoffice";

type Props = {
  order: AdminOrderDetail;
};

function safe(value?: string | null) {
  return value && value.trim() ? value : "-";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("fr-FR");
}

function money(value: number) {
  return `${Number(value ?? 0).toFixed(3)} TND`;
}

function statusBadgeClass(status?: string | null) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized.includes("EN_ATTENTE")) return "badge-warning";
  if (normalized.includes("REFUS")) return "badge-danger";
  if (normalized.includes("TENT")) return "badge-info";
  if (normalized.includes("CONFIRM")) return "badge-success";
  return "badge-neutral";
}

function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value?: string | null;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`max-w-[58%] text-right text-sm ${
          strong ? "font-bold text-card-foreground" : "font-semibold text-card-foreground"
        }`}
      >
        {safe(value)}
      </span>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-[hsl(var(--input))] p-4">
      <div className="app-kicker">{label}</div>
      <div className="mt-2 text-sm font-bold text-card-foreground">{value}</div>
    </div>
  );
}

export function AdminOrderDetailPanel({ order }: Props) {
  const client = order.client;
  const isB2B = (order.clientType ?? client?.typeClient ?? "").toUpperCase() === "B2B";

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-border/70 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="app-kicker">Commande sélectionnée</div>

            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-black text-card-foreground">{safe(order.piece)}</h3>

              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${statusBadgeClass(order.status)}`}
              >
                {safe(order.status)}
              </span>

              <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold badge-neutral">
                {safe(order.documentKind)}
              </span>

              {order.bucket ? (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold badge-neutral">
                  {safe(order.bucket)}
                </span>
              ) : null}
            </div>

            <div className="text-sm text-muted-foreground">
              Client :{" "}
              <span className="font-bold text-card-foreground">
                {safe(order.clientDisplay)}
              </span>
              {order.clientType ? (
                <span className="ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold badge-neutral">
                  {safe(order.clientType)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-[22px] border border-primary/15 bg-card px-5 py-4 shadow-sm lg:min-w-[190px]">
            <div className="app-kicker">Net à payer</div>
            <div className="mt-2 text-2xl font-black text-primary">
              {money(order.netAPayer)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Total TTC : {money(order.totalTTC)}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Date document" value={formatDate(order.date)} />
        <MetricCard label="Date Creation" value={formatDate(order.cbCreation)} />
        <MetricCard label="Date Modifi cation" value={formatDate(order.cbModification)} />
        <MetricCard label="Mode livraison" value={safe(order.deliveryType)} />
      </section>

      <section className="app-surface overflow-hidden p-0">
        <div className="border-b border-border/70 px-5 py-4">
          <div className="app-kicker">Lignes</div>
          <h4 className="mt-1 text-lg font-black text-card-foreground">
            Produits commandés
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[hsl(var(--input))]">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <th className="px-5 py-4">Référence</th>
                <th className="px-5 py-4">Produit</th>
                <th className="px-5 py-4 text-center">Qté</th>
                <th className="px-5 py-4 text-right">PU</th>
                <th className="px-5 py-4 text-right">HT</th>
                <th className="px-5 py-4 text-right">TTC</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {order.lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Aucune ligne trouvée.
                  </td>
                </tr>
              ) : (
                order.lines.map((line, index) => (
                  <tr key={`${line.articleRef}-${index}`} className="hover:bg-accent/30">
                    <td className="px-5 py-4 align-top">
                      <span className="inline-flex rounded-xl border border-border/70 bg-card px-2.5 py-1 font-mono text-xs font-bold text-card-foreground">
                        {safe(line.articleRef)}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="font-semibold text-card-foreground">
                        {safe(line.designation)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center align-top font-semibold text-card-foreground">
                      {line.qty}
                    </td>
                    <td className="px-5 py-4 text-right align-top text-card-foreground">
                      {money(line.unitPrice)}
                    </td>
                    <td className="px-5 py-4 text-right align-top text-card-foreground">
                      {money(line.amountHT)}
                    </td>
                    <td className="px-5 py-4 text-right align-top font-bold text-card-foreground">
                      {money(line.amountTTC)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <div className="app-surface overflow-hidden p-0">
            <div className="border-b border-border/70 px-5 py-4">
              <div className="app-kicker">Client</div>
              <h4 className="mt-1 text-lg font-black text-card-foreground">
                Informations client
              </h4>
            </div>

            <div className="px-5 py-4">
              <InfoRow label="Nom" value={order.clientDisplay} strong />
              <InfoRow label="Type" value={order.clientType} />
              <InfoRow label="Email" value={client?.email} />
              <InfoRow label="Téléphone" value={client?.telephone} />

              {isB2B ? (
                <>
                  <div className="my-2 h-px bg-border/70" />
                  <InfoRow label="Société" value={client?.nomSociete} />
                  <InfoRow label="ICE / IF" value={client?.matriculeFiscal} />
                  <InfoRow label="RC" value={client?.registreCommerce} />
                  <InfoRow label="TVA" value={client?.numeroTVA} />
                </>
              ) : (
                <>
                  <div className="my-2 h-px bg-border/70" />
                  <InfoRow label="Nom complet" value={client?.nomComplet} />
                  <InfoRow label="CIN" value={client?.cin} />
                  <InfoRow label="Date naissance" value={formatDate(client?.dateNaissance)} />
                </>
              )}
            </div>
          </div>

          <div className="app-surface overflow-hidden p-0">
            <div className="border-b border-border/70 px-5 py-4">
              <div className="app-kicker">Adresse</div>
              <h4 className="mt-1 text-lg font-black text-card-foreground">
                Livraison
              </h4>
            </div>

            <div className="px-5 py-4">
              <InfoRow label="Adresse" value={order.address} strong />
              <InfoRow label="Ville" value={order.city} />
              <InfoRow label="Code postal" value={order.postalCode} />
              <InfoRow label="Latitude" value={order.latitude} />
              <InfoRow label="Longitude" value={order.longitude} />
            </div>
          </div>
        </div>

        <div className="app-surface overflow-hidden p-0">
          <div className="border-b border-border/70 px-5 py-4">
            <div className="app-kicker">Synthèse financière</div>
            <h4 className="mt-1 text-lg font-black text-card-foreground">
              Totalisation
            </h4>
          </div>

          <div className="px-5 py-4">
            <InfoRow label="Mode de paiement" value={order.paymentMethod} />
            <InfoRow label="Mode de livraison" value={order.deliveryType} />
            <div className="my-2 h-px bg-border/70" />
            <InfoRow label="Total HT" value={money(order.totalHT)} />
            <InfoRow label="Total TTC" value={money(order.totalTTC)} />
            <InfoRow label="Frais livraison" value={money(order.fraisLivraison)} />
            <InfoRow label="Timbre fiscal" value={money(order.timbreFiscal)} />

            <div className="mt-4 rounded-[20px] border border-primary/15 bg-primary/6 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-muted-foreground">Net à payer</span>
                <span className="text-xl font-black text-primary">
                  {money(order.netAPayer)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}