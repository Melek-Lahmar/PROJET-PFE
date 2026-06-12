import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEnAttente,
  getImprime,
  getHistorique,
  getBlocDetail,
  getBlocPdf,
  getSingleBlPdf,
  printManifeste,
  openPdfBlob,
  type ManifesteBLItem,
  type ManifesteBlocSummary,
} from "../api/manifesteApi";

// ── Types ────────────────────────────────────────────────────────────────────

type Mode = "DOMICILE" | "TRANSIT";
type SubTab = "en-attente" | "imprime" | "historique";

const MODE_META: Record<Mode, { label: string; color: "green" | "orange"; icon: string; subtitle: string }> = {
  DOMICILE: { label: "Livraison à domicile", color: "green", icon: "🏠", subtitle: "Même gouvernorat que le dépôt" },
  TRANSIT: { label: "Transit inter-dépôt", color: "orange", icon: "🔀", subtitle: "Vers un autre dépôt / gouvernorat" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function money(v?: number | null) {
  return typeof v === "number" ? `${v.toFixed(3)} TND` : "—";
}

function getAgeDays(dateStr?: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function AgeBadge({ dateStr }: { dateStr?: string | null }) {
  const d = getAgeDays(dateStr);
  if (d === 0) return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Aujourd'hui</span>;
  if (d === 1) return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Hier</span>;
  if (d <= 3)  return <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{d}j</span>;
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">{d}j ⚠</span>;
}

const PrinterIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

// ── Ligne BL avec articles expandables ────────────────────────────────────────

function BLRow({
  bl,
  index,
  onPrint,
  isPrinting,
  printLabel,
}: {
  bl: ManifesteBLItem;
  index: number;
  onPrint: () => void;
  isPrinting: boolean;
  printLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const isUrgent = getAgeDays(bl.date) >= 3;

  return (
    <div className={`border-b border-border/40 last:border-0 ${isUrgent ? "bg-red-50/30 dark:bg-red-900/5" : ""}`}>
      <div className="grid grid-cols-12 items-center gap-2 px-4 py-3 hover:bg-muted/20">
        <div className="col-span-1 text-xs font-bold text-muted-foreground">{index}</div>

        <div className="col-span-2">
          <span className="rounded-lg border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs font-bold">
            {bl.piece}
          </span>
        </div>

        <div className="col-span-3 truncate">
          <p className="truncate text-sm font-semibold text-card-foreground">{bl.clientName || bl.clientCode}</p>
          {bl.destinationGouvernorat && (
            <p className="text-[10px] text-orange-600 dark:text-orange-400">→ {bl.destinationGouvernorat}</p>
          )}
        </div>

        <div className="col-span-2 text-right text-sm font-bold text-card-foreground">
          {money(bl.netAPayer)}
        </div>

        <div className="col-span-2 flex flex-col gap-0.5">
          <span className="text-[11px] text-muted-foreground">
            {bl.date ? new Date(bl.date).toLocaleDateString("fr-FR") : "—"}
          </span>
          <AgeBadge dateStr={bl.date} />
        </div>

        <div className="col-span-2 flex items-center justify-end gap-1.5">
          {bl.lines.length > 0 && (
            <button
              onClick={() => setOpen((o) => !o)}
              title="Voir les articles"
              className="rounded-xl border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted"
            >
              {open ? "▲" : `▼ ${bl.lines.length}`}
            </button>
          )}
          <button
            onClick={onPrint}
            disabled={isPrinting}
            title={`${printLabel} ${bl.piece}`}
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition ${
              isPrinting
                ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                : "border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            {isPrinting ? <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" /> : <PrinterIcon className="h-3 w-3" />}
            <span>BL</span>
          </button>
        </div>
      </div>

      {open && bl.lines.length > 0 && (
        <div className="border-t border-border/20 bg-muted/10 px-6 pb-3 pt-2">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Articles — {bl.lines.length} ligne(s)
          </p>
          <div className="space-y-1">
            {bl.lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-muted-foreground">{l.articleRef}</span>
                  <span className="text-card-foreground">{l.designation || "—"}</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-muted-foreground">x{l.qty}</span>
                  <span className="font-semibold text-card-foreground">{money(l.amountTTC)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section liste de BLs (réutilisée par En attente et Imprimé) ────────────────

function BLSection({
  title,
  color,
  icon,
  bls,
  emptyLabel,
  onPrintAll,
  isPrintingAll,
  printAllLabel = "Imprimer tout",
  rowPrintLabel = "Imprimer BL",
  registerMode,
}: {
  title: string;
  color: "green" | "orange";
  icon: string;
  bls: ManifesteBLItem[];
  emptyLabel: string;
  onPrintAll?: () => void;
  isPrintingAll?: boolean;
  printAllLabel?: string;
  rowPrintLabel?: string;
  // Si défini : imprimer une ligne ENREGISTRE un bloc (le BL quitte « Imprimé »
  // et part dans « Historique »). Sinon : simple aperçu PDF, sans changement d'état.
  registerMode?: Mode;
}) {
  const qc = useQueryClient();
  const [printingRows, setPrintingRows] = useState<Set<string>>(new Set());
  const totalAmount = bls.reduce((s, b) => s + (b.netAPayer ?? 0), 0);

  const handleSinglePrint = async (piece: string) => {
    setPrintingRows((prev) => new Set(prev).add(piece));
    try {
      if (registerMode) {
        // Enregistre le bloc (→ Historique, sort de « Imprimé »)…
        await printManifeste([piece], registerMode);
        qc.invalidateQueries({ queryKey: ["manifeste-en-attente"] });
        qc.invalidateQueries({ queryKey: ["manifeste-imprime"] });
        qc.invalidateQueries({ queryKey: ["manifeste-historique"] });
      }
      // …mais affiche TOUJOURS la même fiche BL qu'en « En attente ».
      const blob = await getSingleBlPdf(piece);
      openPdfBlob(blob, `bl-${piece}.pdf`);
    } finally {
      setPrintingRows((prev) => { const s = new Set(prev); s.delete(piece); return s; });
    }
  };

  const colorClasses = {
    green: {
      header: "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/10",
      title: "text-emerald-700 dark:text-emerald-400",
      btn: "border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600",
      count: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    orange: {
      header: "border-orange-200 bg-orange-50 dark:border-orange-800/50 dark:bg-orange-900/10",
      title: "text-orange-700 dark:text-orange-400",
      btn: "border-orange-300 bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600",
      count: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    },
  }[color];

  if (bls.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className={`flex items-center justify-between border-b border-border px-5 py-3.5 ${colorClasses.header}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <h3 className={`text-sm font-extrabold ${colorClasses.title}`}>{title}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${colorClasses.count}`}>0</span>
          </div>
        </div>
        <div className="flex flex-col items-center py-10 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5 ${colorClasses.header}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className={`text-sm font-extrabold ${colorClasses.title}`}>{title}</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${colorClasses.count}`}>{bls.length} BL</span>
          <span className={`text-xs font-semibold ${colorClasses.title}`}>{money(totalAmount)}</span>
        </div>
        {onPrintAll && (
          <button
            onClick={onPrintAll}
            disabled={isPrintingAll}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50 ${colorClasses.btn}`}
          >
            {isPrintingAll ? (
              <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> Impression...</>
            ) : (
              <><PrinterIcon /> {printAllLabel} ({bls.length})</>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/30 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <div className="col-span-1">#</div>
        <div className="col-span-2">N° BL</div>
        <div className="col-span-3">Client{color === "orange" ? " / Destination" : ""}</div>
        <div className="col-span-2 text-right">Montant</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {bls.map((bl, idx) => (
        <BLRow
          key={bl.piece}
          bl={bl}
          index={idx + 1}
          onPrint={() => handleSinglePrint(bl.piece)}
          isPrinting={printingRows.has(bl.piece)}
          printLabel={rowPrintLabel}
        />
      ))}

      <div className="flex items-center justify-between border-t border-border bg-muted/10 px-5 py-2.5">
        <span className="text-xs text-muted-foreground">{bls.length} bon(s) de livraison</span>
        <span className="text-sm font-black text-card-foreground">Total : {money(totalAmount)}</span>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function filterByMode(items: ManifesteBLItem[], mode: Mode): ManifesteBLItem[] {
  return items.filter((b) => (mode === "TRANSIT" ? b.routeType === "TRANSIT" : b.routeType !== "TRANSIT"));
}

// ── Onglet « En attente » (à imprimer) ─────────────────────────────────────────

// Seuil « commande perdue » : statut inchangé / toujours au dépôt depuis N jours.
const LOST_DAYS = 3;

function EnAttenteTab({ mode }: { mode: Mode }) {
  const [onlyLost, setOnlyLost] = useState(false);
  const meta = MODE_META[mode];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["manifeste-en-attente"],
    queryFn: getEnAttente,
  });

  const all = filterByMode(data?.items ?? [], mode);
  // Les plus anciennes en haut → les éventuelles « perdues » sautent aux yeux.
  const sorted = [...all].sort((a, b) => getAgeDays(b.date) - getAgeDays(a.date));
  const lost = sorted.filter((b) => getAgeDays(b.date) >= LOST_DAYS);
  const shown = onlyLost ? lost : sorted;

  if (isLoading) return <Spinner />;

  if (isError)
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900/40 dark:bg-red-900/10">
        <p className="font-semibold text-red-600">Erreur de chargement.</p>
        <button onClick={() => refetch()} className="mt-3 rounded-lg border border-red-300 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100">
          Réessayer
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            🔎 Station de surveillance (pas d'impression ici). Repère les <b>commandes bloquées</b> dont le statut n'a pas bougé depuis ≥ {LOST_DAYS} jours.
          </p>
          <button onClick={() => refetch()} className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted">
            ↻ Actualiser
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{all.length} au dépôt</span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
            lost.length
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          }`}>
            {lost.length} bloquée{lost.length > 1 ? "s" : ""} (≥ {LOST_DAYS}j)
          </span>
          {lost.length > 0 && (
            <button
              onClick={() => setOnlyLost((v) => !v)}
              className="rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300"
            >
              {onlyLost ? "Voir tout" : "⚠ Voir seulement les bloquées"}
            </button>
          )}
        </div>
      </div>

      <BLSection
        title={meta.label}
        color={meta.color}
        icon={meta.icon}
        bls={shown}
        emptyLabel={onlyLost ? "Aucune commande bloquée 🎉" : "Aucune commande au dépôt pour le moment."}
        rowPrintLabel="Imprimer BL"
      />
    </div>
  );
}

// ── Onglet « Imprimé » (déjà imprimés, pas encore partis) ──────────────────────

function ImprimeTab({ mode }: { mode: Mode }) {
  const qc = useQueryClient();
  const meta = MODE_META[mode];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["manifeste-imprime"],
    queryFn: getImprime,
  });

  const bls = filterByMode(data?.items ?? [], mode);

  const printMut = useMutation({
    mutationFn: (pieces: string[]) => printManifeste(pieces, mode),
    onSuccess: (blob) => {
      openPdfBlob(blob, `manifeste-${mode.toLowerCase()}-${Date.now()}.pdf`);
      qc.invalidateQueries({ queryKey: ["manifeste-en-attente"] });
      qc.invalidateQueries({ queryKey: ["manifeste-imprime"] });
      qc.invalidateQueries({ queryKey: ["manifeste-historique"] });
    },
  });

  if (isLoading) return <Spinner />;

  if (isError)
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900/40 dark:bg-red-900/10">
        <p className="font-semibold text-red-600">Erreur de chargement.</p>
        <button onClick={() => refetch()} className="mt-3 rounded-lg border border-red-300 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100">
          Réessayer
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-3">
        <p className="text-sm text-muted-foreground">
          BL à imprimer. Imprimer (<b>tout</b> ou <b>un seul</b>) enregistre le manifeste : le BL quitte cet onglet et part dans l'<b>Historique</b>.
        </p>
        <button onClick={() => refetch()} className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted">
          ↻ Actualiser
        </button>
      </div>

      {printMut.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-900/10">
          Erreur lors de l'impression. Veuillez réessayer.
        </div>
      )}

      <BLSection
        title={meta.label}
        color={meta.color}
        icon={meta.icon}
        bls={bls}
        emptyLabel="Aucun BL à imprimer."
        onPrintAll={() => printMut.mutate(bls.map((b) => b.piece))}
        isPrintingAll={printMut.isPending}
        printAllLabel="Imprimer tout"
        rowPrintLabel="Imprimer BL"
        registerMode={mode}
      />
    </div>
  );
}

// ── Onglet « Historique » ──────────────────────────────────────────────────────

function HistoriqueTab({ mode }: { mode: Mode }) {
  const [page, setPage] = useState(1);
  const [openBlocId, setOpenBlocId] = useState<number | null>(null);
  const [printingRows, setPrintingRows] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["manifeste-historique", mode, page],
    queryFn: () => getHistorique(page, 20, mode),
  });

  const { data: blocDetail } = useQuery({
    queryKey: ["manifeste-bloc", openBlocId],
    queryFn: () => getBlocDetail(openBlocId!),
    enabled: openBlocId !== null,
  });

  const pdfMut = useMutation({
    mutationFn: getBlocPdf,
    onSuccess: (blob, id) => openPdfBlob(blob, `manifeste-${id}.pdf`),
  });

  const handleSinglePrint = async (piece: string) => {
    setPrintingRows((prev) => new Set(prev).add(piece));
    try {
      const blob = await getSingleBlPdf(piece);
      openPdfBlob(blob, `bl-${piece}.pdf`);
    } finally {
      setPrintingRows((prev) => { const s = new Set(prev); s.delete(piece); return s; });
    }
  };

  if (isLoading) return <Spinner />;

  const items: ManifesteBlocSummary[] = data?.items ?? [];

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20">
          <p className="font-semibold text-muted-foreground">Aucun manifeste imprimé pour cette catégorie.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="grid grid-cols-12 gap-3 border-b border-border bg-muted/40 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <div className="col-span-1">Bloc</div>
            <div className="col-span-3">Date impression</div>
            <div className="col-span-2 text-right">Nb BLs</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-4 text-right">Actions</div>
          </div>

          {items.map((b) => (
            <div key={b.id} className="border-b border-border/40 last:border-0">
              <div className="grid grid-cols-12 items-center gap-3 px-5 py-4 hover:bg-muted/20">
                <div className="col-span-1 font-mono text-xs font-bold text-muted-foreground">#{b.id}</div>
                <div className="col-span-3 text-sm text-card-foreground">{new Date(b.printedAt).toLocaleString("fr-FR")}</div>
                <div className="col-span-2 text-right">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{b.blCount} BL</span>
                </div>
                <div className="col-span-2 text-right text-sm font-bold text-card-foreground">{money(b.totalAmount)}</div>
                <div className="col-span-4 flex justify-end gap-2">
                  <button
                    onClick={() => setOpenBlocId(openBlocId === b.id ? null : b.id)}
                    className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted"
                  >
                    {openBlocId === b.id ? "▲ Fermer" : "▼ Détail"}
                  </button>
                  <button
                    onClick={() => pdfMut.mutate(b.id)}
                    disabled={pdfMut.isPending && pdfMut.variables === b.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                  >
                    <PrinterIcon />
                    Réimprimer
                  </button>
                </div>
              </div>

              {openBlocId === b.id && blocDetail && (
                <div className="border-t border-border/30 bg-muted/10 px-6 py-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">BL du manifeste #{b.id}</p>
                  <div className="overflow-hidden rounded-xl border border-border bg-card">
                    {/* Même affichage que « En attente » : nom client, destination, date, âge, articles dépliables */}
                    {(blocDetail.items ?? []).map((bl, idx) => (
                      <BLRow
                        key={bl.piece}
                        bl={bl}
                        index={idx + 1}
                        onPrint={() => handleSinglePrint(bl.piece)}
                        isPrinting={printingRows.has(bl.piece)}
                        printLabel="Imprimer BL"
                      />
                    ))}
                    {(blocDetail.items ?? []).length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun BL.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-40">← Précédent</button>
          <span className="text-sm font-semibold text-muted-foreground">Page {page} / {Math.ceil(data.total / data.pageSize)}</span>
          <button disabled={page >= Math.ceil(data.total / data.pageSize)} onClick={() => setPage((p) => p + 1)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-40">Suivant →</button>
        </div>
      )}
    </div>
  );
}

// ── Écran de sélection du mode (2 gros boutons) ────────────────────────────────

function ModeSelection({ onPick }: { onPick: (m: Mode) => void }) {
  // Badge « à imprimer » = file d'impression (BL pas encore imprimés).
  const { data } = useQuery({ queryKey: ["manifeste-imprime"], queryFn: getImprime });
  const items = data?.items ?? [];
  const counts: Record<Mode, number> = {
    DOMICILE: filterByMode(items, "DOMICILE").length,
    TRANSIT: filterByMode(items, "TRANSIT").length,
  };

  const cards: { mode: Mode; ring: string; bg: string; text: string; badge: string }[] = [
    { mode: "DOMICILE", ring: "hover:border-emerald-400 focus:border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10", text: "text-emerald-700 dark:text-emerald-400", badge: "bg-emerald-600 text-white" },
    { mode: "TRANSIT", ring: "hover:border-orange-400 focus:border-orange-500", bg: "bg-orange-50 dark:bg-orange-900/10", text: "text-orange-700 dark:text-orange-400", badge: "bg-orange-600 text-white" },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {cards.map((c) => {
        const meta = MODE_META[c.mode];
        return (
          <button
            key={c.mode}
            onClick={() => onPick(c.mode)}
            className={`group flex flex-col items-start gap-4 rounded-3xl border-2 border-border ${c.bg} p-7 text-left shadow-sm transition ${c.ring} hover:shadow-md`}
          >
            <div className="flex w-full items-start justify-between">
              <span className="text-5xl">{meta.icon}</span>
              {counts[c.mode] > 0 && (
                <span className={`rounded-full px-3 py-1 text-sm font-black ${c.badge}`}>
                  {counts[c.mode]} à imprimer
                </span>
              )}
            </div>
            <div>
              <h2 className={`text-xl font-black ${c.text}`}>{meta.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{meta.subtitle}</p>
            </div>
            <span className={`mt-2 inline-flex items-center gap-1 text-sm font-bold ${c.text}`}>
              Ouvrir <span className="transition group-hover:translate-x-1">→</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Vue d'un mode (3 onglets) ──────────────────────────────────────────────────

function ModeView({ mode, onBack }: { mode: Mode; onBack: () => void }) {
  const [tab, setTab] = useState<SubTab>("en-attente");
  const meta = MODE_META[mode];

  const tabs: { id: SubTab; label: string; desc: string }[] = [
    { id: "en-attente", label: "En attente", desc: "Surveillance" },
    { id: "imprime", label: "Imprimé", desc: "À imprimer" },
    { id: "historique", label: "Historique", desc: "Manifestes imprimés" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-xl border border-border px-3 py-2 text-sm font-semibold transition hover:bg-muted"
        >
          ← Retour
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <h2 className="text-lg font-black text-foreground">{meta.label}</h2>
            <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 rounded-2xl border border-border bg-muted/30 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 flex-col items-center rounded-xl px-3 py-2 text-center transition ${
              tab === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-sm font-bold">{t.label}</span>
            <span className="text-[10px] font-medium opacity-70">{t.desc}</span>
          </button>
        ))}
      </div>

      {tab === "en-attente" && <EnAttenteTab mode={mode} />}
      {tab === "imprime" && <ImprimeTab mode={mode} />}
      {tab === "historique" && <HistoriqueTab mode={mode} />}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export function VendeurManifestPage() {
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <div className="w-full space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Expédition &amp; impression</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode
            ? "Préparez et imprimez les bons de livraison de votre dépôt."
            : "Choisissez le type d'expédition à préparer."}
        </p>
      </div>

      {mode ? <ModeView mode={mode} onBack={() => setMode(null)} /> : <ModeSelection onPick={setMode} />}
    </div>
  );
}
