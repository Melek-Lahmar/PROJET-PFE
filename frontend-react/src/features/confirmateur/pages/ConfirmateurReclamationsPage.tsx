import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { EmptyView } from "../../../shared/components/premium";
import { useToast } from "../../../shared/components/premium/Toast";
import {
  getConfirmateurReclamationDetails,
  getConfirmateurReclamations,
  reprendreConfirmateurReclamation,
  updateConfirmateurReclamationNote,
  updateConfirmateurReclamationStatus,
} from "../api/confirmateurApi";
import type { ReclamationDetails, ReclamationListItem, ReclamationStatus, ReclamationTab } from "../types/confirmateur";

type SourceFilter = "ALL" | "CLIENT" | "LIVREUR";
type StatusFilter = "ALL" | ReclamationStatus;

const TABS: Array<{ value: ReclamationTab; label: string; hint: string }> = [
  { value: "a-traiter", label: "À traiter", hint: "Nouveaux dossiers" },
  { value: "en-attente-client", label: "En traitement", hint: "Suivi actif" },
  { value: "historique", label: "Historique", hint: "Dossiers clos" },
];

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "ENVOYEE", label: "Envoyée" },
  { value: "EN_COURS_DE_TRAITEMENT", label: "En cours" },
  { value: "CLOTUREE", label: "Clôturée" },
  { value: "REFUSEE", label: "Refusée" },
];

const SOURCE_OPTIONS: Array<{ value: SourceFilter; label: string }> = [
  { value: "ALL", label: "Toutes sources" },
  { value: "CLIENT", label: "Client" },
  { value: "LIVREUR", label: "Livreur" },
];

const SELECT_CLASS =
  "h-11 rounded-2xl border border-border/70 bg-card px-3 text-sm font-semibold text-card-foreground shadow-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

function safe(value?: string | null) {
  return value && value.trim() ? value.trim() : "-";
}

function money(value?: number | null) {
  return typeof value === "number" ? `${value.toFixed(3)} TND` : "-";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function statusLabel(status?: string | null) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "ENVOYEE") return "Envoyée";
  if (normalized === "EN_COURS_DE_TRAITEMENT") return "En cours";
  if (normalized === "CLOTUREE") return "Clôturée";
  if (normalized === "REFUSEE") return "Refusée";
  return normalized || "Inconnu";
}

function statusClass(status?: string | null) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "CLOTUREE") return "badge-success";
  if (normalized === "REFUSEE") return "badge-danger";
  if (normalized === "EN_COURS_DE_TRAITEMENT") return "badge-info";
  return "badge-warning";
}

function priorityClass(priority?: string | null) {
  const normalized = (priority ?? "").toUpperCase();
  if (normalized.includes("URG") || normalized.includes("HAUT") || normalized.includes("HIGH")) return "badge-danger";
  if (normalized.includes("BAS") || normalized.includes("LOW")) return "badge-muted";
  return "badge-warning";
}

function motifLabel(value?: string | null) {
  const normalized = (value ?? "").toUpperCase();
  if (normalized === "CHANGEMENT_ADRESSE") return "Changement adresse";
  if (normalized === "CHANGEMENT_NUMERO") return "Changement numéro";
  if (normalized === "REPROGRAMMATION") return "Reprogrammation";
  if (normalized === "ANNULATION") return "Annulation";
  if (normalized === "COLIS_NON_RECU") return "Colis non reçu";
  if (normalized === "COLIS_ENDOMMAGE") return "Colis endommagé";
  if (normalized === "COLIS_NON_CORRESPONDANT") return "Colis non conforme";
  if (normalized === "NUMERO_INCORRECT") return "Numéro incorrect";
  if (normalized === "ADRESSE_INCORRECTE") return "Adresse incorrecte";
  if (normalized === "CLIENT_ABSENT") return "Client absent";
  if (normalized === "CLIENT_INJOIGNABLE") return "Client injoignable";
  if (normalized === "CLIENT_REFUSE") return "Client refuse";
  return value || "-";
}

function matchesSearch(item: ReclamationListItem, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [
    item.codeReclamation,
    item.doPiece,
    item.clientDisplay,
    item.clientPhone,
    item.clientGouvernorat,
    item.motif,
    item.descriptionPreview,
    item.source,
    item.typeCas,
    item.arRef,
    item.arDesignation,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-4 shadow-sm">
      <div className="text-[11px] font-black uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-black text-card-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{hint}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-b-0">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-card-foreground">{value === null || value === undefined || value === "" ? "-" : value}</span>
    </div>
  );
}

function DetailPanel({
  details,
  isLoading,
  onTake,
  onStatus,
  onSaveNote,
  busy,
}: {
  details?: ReclamationDetails;
  isLoading: boolean;
  onTake: () => void;
  onStatus: (status: ReclamationStatus, reason?: string | null) => void;
  onSaveNote: (note: string) => void;
  busy: boolean;
}) {
  if (isLoading) {
    return (
      <aside className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="text-sm font-semibold text-muted-foreground">Chargement du dossier...</div>
      </aside>
    );
  }

  if (!details) {
    return (
      <aside className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <EmptyView
          title="Sélectionnez une réclamation"
          description="Le dossier complet apparaîtra ici."
          iconPath="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z M12 7v5 M12 16h.01"
        />
      </aside>
    );
  }

  return (
    <DetailPanelContent
      key={details.id}
      details={details}
      onTake={onTake}
      onStatus={onStatus}
      onSaveNote={onSaveNote}
      busy={busy}
    />
  );
}

function DetailPanelContent({
  details,
  onTake,
  onStatus,
  onSaveNote,
  busy,
}: {
  details: ReclamationDetails;
  onTake: () => void;
  onStatus: (status: ReclamationStatus, reason?: string | null) => void;
  onSaveNote: (note: string) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState(details.noteInterne ?? "");
  const [refusReason, setRefusReason] = useState(details.motifRefus ?? "");
  const isClosed = details.statut === "CLOTUREE" || details.statut === "REFUSEE";
  const canTake = details.statut === "ENVOYEE";

  return (
    <aside className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-mono text-xs font-black text-primary">{details.codeReclamation || `REC-${details.id}`}</div>
          <h2 className="mt-1 text-xl font-black text-card-foreground">{motifLabel(details.motif)}</h2>
          <div className="mt-2 text-sm text-muted-foreground">Commande {safe(details.doPiece)} · {safe(details.source)}</div>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(details.statut)}`}>
          {statusLabel(details.statut)}
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
          <div className="text-sm font-black text-card-foreground">Client</div>
          <div className="mt-2">
            <InfoRow label="Nom" value={details.clientDisplay} />
            <InfoRow label="Téléphone" value={details.clientPhone} />
            <InfoRow label="Email" value={details.clientEmail} />
            <InfoRow label="Gouvernorat" value={details.clientGouvernorat} />
            <InfoRow label="Délégation" value={details.clientDelegation} />
            <InfoRow label="Adresse" value={details.clientAddress} />
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
          <div className="text-sm font-black text-card-foreground">Commande</div>
          <div className="mt-2">
            <InfoRow label="Pièce" value={details.doPiece} />
            <InfoRow label="Date" value={formatDateTime(details.orderDate)} />
            <InfoRow label="Statut" value={details.orderStatut} />
            <InfoRow label="Mode livraison" value={details.orderDeliveryMode} />
            <InfoRow label="Paiement" value={details.orderPaymentMethod} />
            <InfoRow label="Net à payer" value={money(details.orderNetAPayer)} />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
        <div className="text-sm font-black text-card-foreground">Description</div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{details.description || details.descriptionPreview || "-"}</p>
        {details.correctionProposee ? (
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm font-semibold text-primary">
            Correction proposée : {details.correctionProposee}
          </div>
        ) : null}
        {details.motifRefus ? (
          <div className="mt-3 rounded-xl border border-[hsl(var(--danger)/0.24)] bg-[hsl(var(--danger)/0.08)] p-3 text-sm font-semibold text-[hsl(var(--danger))]">
            Motif de refus : {details.motifRefus}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-card-foreground">Lignes commande</div>
            <span className="text-xs font-bold text-muted-foreground">{details.orderLines.length}</span>
          </div>
          <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
            {details.orderLines.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucune ligne disponible.</div>
            ) : (
              details.orderLines.map((line) => (
                <div key={`${line.arRef}-${line.designation}`} className="rounded-xl border border-border/70 bg-card px-3 py-2">
                  <div className="font-mono text-xs font-black text-primary">{line.arRef}</div>
                  <div className="mt-1 text-sm font-semibold text-card-foreground">{safe(line.designation)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Qté {line.qty} · {money(line.amountTTC)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-card-foreground">Tentatives & preuves</div>
            <span className="text-xs font-bold text-muted-foreground">{details.tentatives.length} / {details.photos.length}</span>
          </div>
          <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
            {details.tentatives.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucune tentative enregistrée.</div>
            ) : (
              details.tentatives.map((attempt) => (
                <div key={attempt.id} className="rounded-xl border border-border/70 bg-card px-3 py-2">
                  <div className="text-sm font-black text-card-foreground">{motifLabel(attempt.motif)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(attempt.dateJour)} · {safe(attempt.livreurDisplay)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
        <label className="text-sm font-black text-card-foreground" htmlFor="reclamation-note">
          Note interne
        </label>
        <textarea
          id="reclamation-note"
          className="mt-2 min-h-24 w-full rounded-2xl border border-border/70 bg-card px-3 py-3 text-sm text-card-foreground outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ajouter une note de suivi..."
        />
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onSaveNote(note)}>
            Enregistrer la note
          </Button>
        </div>
      </div>

      {!isClosed ? (
        <div className="mt-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
          <div className="text-sm font-black text-card-foreground">Décision confirmatrice</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canTake ? (
              <Button type="button" variant="primary" size="sm" disabled={busy} onClick={onTake}>
                Prendre en charge
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onStatus("EN_COURS_DE_TRAITEMENT")}>
              Marquer en cours
            </Button>
            <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => onStatus("CLOTUREE")}>
              Clôturer
            </Button>
          </div>
          <div className="mt-4">
            <label className="text-xs font-black text-muted-foreground" htmlFor="reclamation-refus">
              Motif de refus
            </label>
            <textarea
              id="reclamation-refus"
              className="mt-2 min-h-20 w-full rounded-2xl border border-border/70 bg-card px-3 py-3 text-sm text-card-foreground outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              value={refusReason}
              onChange={(event) => setRefusReason(event.target.value)}
              placeholder="Obligatoire pour refuser le dossier..."
            />
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="destructive" size="sm" disabled={busy || !refusReason.trim()} onClick={() => onStatus("REFUSEE", refusReason.trim())}>
                Refuser
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

export function ConfirmateurReclamationsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialTab = TABS.some((item) => item.value === searchParams.get("tab"))
    ? (searchParams.get("tab") as ReclamationTab)
    : "a-traiter";
  const [tab, setTab] = useState<ReclamationTab>(initialTab);
  const [source, setSource] = useState<SourceFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [crossGouvernorat, setCrossGouvernorat] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const listQuery = useQuery({
    queryKey: ["confirmateur", "reclamations", tab, source, status, crossGouvernorat],
    queryFn: () =>
      getConfirmateurReclamations({
        tab,
        crossGouvernorat,
        source: source === "ALL" ? null : source,
        statut: status === "ALL" ? null : status,
      }),
  });

  const items = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const filtered = useMemo(() => items.filter((item) => matchesSearch(item, search)), [items, search]);
  const effectiveSelectedId = filtered.some((item) => item.id === selectedId) ? selectedId : filtered[0]?.id ?? null;

  const detailsQuery = useQuery({
    queryKey: ["confirmateur", "reclamations", effectiveSelectedId],
    queryFn: () => getConfirmateurReclamationDetails(effectiveSelectedId as number),
    enabled: effectiveSelectedId !== null,
  });

  const invalidateReclamations = async (details?: ReclamationDetails) => {
    await qc.invalidateQueries({ queryKey: ["confirmateur", "reclamations"] });
    if (details?.id) {
      setSelectedId(details.id);
    }
  };

  const takeMutation = useMutation({
    mutationFn: reprendreConfirmateurReclamation,
    onSuccess: async (details) => {
      toast.success("Réclamation prise en charge");
      await invalidateReclamations(details);
    },
    onError: (error) => toast.error("Action impossible", getApiErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus, reason }: { id: number; nextStatus: ReclamationStatus; reason?: string | null }) =>
      updateConfirmateurReclamationStatus(id, nextStatus, reason),
    onSuccess: async (details) => {
      toast.success("Statut mis à jour", statusLabel(details.statut));
      await invalidateReclamations(details);
    },
    onError: (error) => toast.error("Mise à jour impossible", getApiErrorMessage(error)),
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, nextNote }: { id: number; nextNote: string }) => updateConfirmateurReclamationNote(id, nextNote),
    onSuccess: async (details) => {
      toast.success("Note enregistrée");
      await invalidateReclamations(details);
    },
    onError: (error) => toast.error("Note non enregistrée", getApiErrorMessage(error)),
  });

  const metrics = useMemo(() => ({
    total: filtered.length,
    envoyee: filtered.filter((item) => item.statut === "ENVOYEE").length,
    progress: filtered.filter((item) => item.statut === "EN_COURS_DE_TRAITEMENT").length,
    closed: filtered.filter((item) => item.statut === "CLOTUREE" || item.statut === "REFUSEE").length,
    withProof: filtered.filter((item) => item.photosCount > 0 || item.tentativesCount > 0).length,
  }), [filtered]);

  const selectedDetails = detailsQuery.data;
  const busy = takeMutation.isPending || statusMutation.isPending || noteMutation.isPending;

  const handleStatus = (nextStatus: ReclamationStatus, reason?: string | null) => {
    if (!effectiveSelectedId) return;
    statusMutation.mutate({
      id: effectiveSelectedId,
      nextStatus,
      reason: nextStatus === "REFUSEE" ? reason : null,
    });
  };

  return (
    <div className="w-full space-y-5 pb-10">
      <section className="rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-black text-primary">Confirmatrice / Réclamations</div>
            <h1 className="mt-2 text-2xl font-black text-card-foreground md:text-3xl">Gestion des réclamations</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Suivi des dossiers clients et livreurs affectés à la confirmatrice.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
              {listQuery.isFetching ? "Actualisation..." : "Rafraîchir"}
            </Button>
            <Button type="button" variant={crossGouvernorat ? "primary" : "outline"} onClick={() => setCrossGouvernorat((value) => !value)}>
              {crossGouvernorat ? "Toutes zones" : "Mes dossiers"}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total" value={metrics.total} hint="Résultats affichés" />
        <MetricCard label="Nouveaux" value={metrics.envoyee} hint="À prendre en charge" />
        <MetricCard label="En cours" value={metrics.progress} hint="Suivi actif" />
        <MetricCard label="Clos" value={metrics.closed} hint="Clôturés ou refusés" />
        <MetricCard label="Preuves" value={metrics.withProof} hint="Photos ou tentatives" />
      </section>

      <section className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                tab === item.value
                  ? "border-primary/30 bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-muted/20 text-card-foreground hover:border-primary/25"
              }`}
            >
              <div className="text-sm font-black">{item.label}</div>
              <div className={tab === item.value ? "text-xs font-semibold text-primary-foreground/75" : "text-xs font-semibold text-muted-foreground"}>{item.hint}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(280px,1fr)_220px_220px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par réclamation, commande, client, téléphone ou motif..."
          />
          <select className={SELECT_CLASS} value={source} onChange={(event) => setSource(event.target.value as SourceFilter)}>
            {SOURCE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select className={SELECT_CLASS} value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
      </section>

      {listQuery.isError ? <div className="ds-alert ds-alert-danger">{getApiErrorMessage(listQuery.error)}</div> : null}
      {detailsQuery.isError ? <div className="ds-alert ds-alert-danger">{getApiErrorMessage(detailsQuery.error)}</div> : null}

      <section className="grid gap-5 2xl:grid-cols-[minmax(720px,1fr)_560px]">
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          {listQuery.isLoading ? (
            <div className="p-5 text-sm font-semibold text-muted-foreground">Chargement des réclamations...</div>
          ) : filtered.length === 0 ? (
            <div className="p-5">
              <EmptyView
                title={items.length === 0 ? "Aucune réclamation" : "Aucun résultat"}
                description={items.length === 0 ? "Les dossiers affectés apparaîtront ici." : "Aucun dossier ne correspond aux filtres actuels."}
                iconPath="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z M12 7v5 M12 16h.01"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="border-b border-border bg-muted/35 text-left text-[11px] font-black uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Dossier</th>
                    <th className="px-4 py-3">Commande</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Motif</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Mise à jour</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filtered.map((item) => {
                    const selected = effectiveSelectedId === item.id;
                    return (
                      <tr key={item.id} className={selected ? "bg-primary/5" : "hover:bg-muted/25"}>
                        <td className="px-4 py-4">
                          <div className="font-mono text-xs font-black text-primary">{item.codeReclamation || `REC-${item.id}`}</div>
                          <div className="mt-1 line-clamp-2 max-w-[260px] text-xs text-muted-foreground">{safe(item.descriptionPreview)}</div>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs font-black text-card-foreground">{safe(item.doPiece)}</td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-card-foreground">{safe(item.clientDisplay)}</div>
                          <div className="text-xs text-muted-foreground">{safe(item.clientPhone)} · {safe(item.clientGouvernorat)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-card-foreground">{motifLabel(item.motif)}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.priorite ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${priorityClass(item.priorite)}`}>{item.priorite}</span> : null}
                            {item.tentativesCount > 0 ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{item.tentativesCount} tent.</span> : null}
                            {item.photosCount > 0 ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{item.photosCount} photo</span> : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-black text-muted-foreground">{safe(item.source)}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(item.statut)}`}>{statusLabel(item.statut)}</span>
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-muted-foreground">{formatDateTime(item.updatedAt)}</td>
                        <td className="px-4 py-4 text-right">
                          <Button type="button" variant={selected ? "primary" : "outline"} size="sm" onClick={() => setSelectedId(item.id)}>
                            Ouvrir
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DetailPanel
          details={selectedDetails}
          isLoading={detailsQuery.isLoading}
          onTake={() => effectiveSelectedId && takeMutation.mutate(effectiveSelectedId)}
          onStatus={handleStatus}
          onSaveNote={(nextNote) => effectiveSelectedId && noteMutation.mutate({ id: effectiveSelectedId, nextNote })}
          busy={busy}
        />
      </section>
    </div>
  );
}
