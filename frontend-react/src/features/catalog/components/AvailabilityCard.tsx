import { useState } from "react";
import type { AvailabilityItem } from "../hooks/useAvailability";
import { Card } from "../../../shared/components/Card";

function StatusBadge({ dispo, unavailableLabel }: { dispo: number; unavailableLabel: string }) {
  const ok = dispo > 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        ok ? "badge-success" : "badge-warning"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-success" : "bg-warning"}`} />
      {ok ? "En stock" : unavailableLabel}
    </span>
  );
}

function QtyPill({ dispo }: { dispo: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        dispo > 0 ? "badge-success" : "badge-danger"
      }`}
    >
      Qté : {dispo}
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function AvailabilityCard({ data, showQuantities = false }: { data: AvailabilityItem[]; showQuantities?: boolean }) {
  const [open, setOpen] = useState(false);
  const unavailableLabel = showQuantities ? "Sur commande (48h)" : "Hors stock";

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-border/60 bg-muted/35 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            🏭
          </div>
          <div>
            <div className="app-kicker">Disponibilité</div>
            <h3 className="mt-1 text-lg font-bold text-card-foreground">Disponibilité par dépôt</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-border bg-card px-4 py-2 text-sm font-semibold text-card-foreground shadow-sm transition hover:border-primary/20 hover:text-primary md:self-auto"
          aria-expanded={open}
          aria-label={open ? "Masquer la disponibilité par dépôt" : "Afficher la disponibilité par dépôt"}
        >
          <span>{open ? "Masquer" : "Afficher"}</span>
          <ChevronIcon open={open} />
        </button>
      </div>

      {open ? (
        <div className="space-y-5 p-6">
          <div className="flex flex-col gap-3 rounded-[24px] border border-primary/15 bg-primary/[0.06] p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card text-sm font-black text-primary shadow-sm">
                WEB
              </div>
              <div>
                <div className="text-sm font-bold text-card-foreground">Achat en ligne</div>
                <div className="text-xs text-muted-foreground">Traitement prioritaire de la commande.</div>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full border border-primary/15 bg-card px-3 py-1 text-xs font-semibold text-primary shadow-sm">
              ⚡ Expédition 24h
            </span>
          </div>

          {data.length === 0 ? (
            <div className="rounded-[24px] border border-border/70 bg-card/75 p-5 text-sm text-muted-foreground">
              Aucune disponibilité par dépôt à afficher.
            </div>
          ) : (
            <div className="space-y-4">
              {data.map((item) => (
                <div
                  key={item.dE_No}
                  className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-card/75 p-4 transition hover:border-primary/15 hover:shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-card-foreground">
                      <span>{item.dE_Intitule}</span>
                      <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.dE_Code}
                      </span>
                    </div>

                    {showQuantities ? (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Dépôt N°{item.dE_No}</span>
                        <span>Physique: {item.aS_QteSto}</span>
                        <span>Réservé: {item.aS_QteRes}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 md:justify-end">
                    {showQuantities ? <QtyPill dispo={item.dispo} /> : null}
                    <StatusBadge dispo={item.dispo} unavailableLabel={unavailableLabel} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
