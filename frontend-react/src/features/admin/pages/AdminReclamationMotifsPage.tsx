import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettingByKey, putSetting } from "../api/settingsApi";
import { useToast } from "../../../shared/components/premium/Toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClientMotif {
  code: string;
  label: string;
  enabled: boolean;
  needsPhoto?: boolean;
  needsCorrection?: boolean;
}

interface ClientMotifsConfig {
  avantLivre: ClientMotif[];
  apresLivre: ClientMotif[];
}

interface LivreurMotif {
  code: string;
  label: string;
  enabled: boolean;
  deferred?: boolean;
  immediate?: string;
  clientVisible?: boolean;
  needsPhoto?: boolean;
  needsDescription?: boolean;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_CLIENT: ClientMotifsConfig = {
  avantLivre: [
    { code: "CHANGEMENT_ADRESSE",   label: "Changement d'adresse",  enabled: true, needsCorrection: true },
    { code: "CHANGEMENT_NUMERO",    label: "Changement de numéro",  enabled: true, needsCorrection: true },
    { code: "REPROGRAMMATION",      label: "Reprogrammation",        enabled: true },
    { code: "ANNULATION",           label: "Annulation",             enabled: true },
    { code: "COLIS_NON_RECU",       label: "Colis non reçu",         enabled: true },
  ],
  apresLivre: [
    { code: "COLIS_ENDOMMAGE",          label: "Colis endommagé",    enabled: true, needsPhoto: true },
    { code: "COLIS_NON_CORRESPONDANT",  label: "Colis non conforme", enabled: true, needsPhoto: true },
  ],
};

const DEFAULT_LIVREUR: LivreurMotif[] = [
  { code: "CLIENT_INJOIGNABLE",    label: "Client non joignable",       enabled: true, deferred: true },
  { code: "TELEPHONE_ETEINT",      label: "Téléphone éteint",           enabled: true, deferred: true },
  { code: "CLIENT_ABSENT",         label: "Client absent",              enabled: true, deferred: true },
  { code: "NUMERO_INCORRECT",      label: "Numéro incorrect",           enabled: true, immediate: "A", clientVisible: true },
  { code: "ADRESSE_INCORRECTE",    label: "Adresse incorrecte",         enabled: true, immediate: "A", clientVisible: true },
  { code: "CLIENT_REFUSE",         label: "Refus client",               enabled: true, immediate: "B" },
  { code: "AUTRE",                 label: "Autre incident",             enabled: true, immediate: "B", needsDescription: true },
  { code: "COLIS_ENDOMMAGE_DEPOT", label: "Colis endommagé au dépôt",  enabled: true, immediate: "B", needsPhoto: true },
];

const CLIENT_KEY  = "reclamation.motifs.client";
const LIVREUR_KEY = "reclamation.motifs.livreur";

// ── Flag badges ────────────────────────────────────────────────────────────────

function FlagBadge({ text, color }: { text: string; color: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {text}
    </span>
  );
}

function ClientMotifFlags({ m }: { m: ClientMotif }) {
  return (
    <div className="flex flex-wrap gap-1">
      {m.needsPhoto      && <FlagBadge text="📷 Photo"      color="bg-amber-100 text-amber-700" />}
      {m.needsCorrection && <FlagBadge text="✏️ Correction" color="bg-blue-100 text-blue-700"   />}
    </div>
  );
}

function LivreurMotifFlags({ m }: { m: LivreurMotif }) {
  return (
    <div className="flex flex-wrap gap-1">
      {m.deferred       && <FlagBadge text="⏳ Différé (3 tentatives)" color="bg-purple-100 text-purple-700" />}
      {m.immediate === "A" && <FlagBadge text="⚡ Immédiat — groupe A"  color="bg-orange-100 text-orange-700" />}
      {m.immediate === "B" && <FlagBadge text="⚡ Immédiat — groupe B"  color="bg-red-100 text-red-700"      />}
      {m.clientVisible  && <FlagBadge text="👁 Visible client"          color="bg-green-100 text-green-700"  />}
      {m.needsPhoto     && <FlagBadge text="📷 Photo"                   color="bg-amber-100 text-amber-700"  />}
      {m.needsDescription && <FlagBadge text="📝 Description min.10"    color="bg-cyan-100 text-cyan-700"    />}
    </div>
  );
}

// ── Motif row ─────────────────────────────────────────────────────────────────

function ClientMotifRow({
  motif,
  onChange,
  onAdd,
  onRemove,
  isNew = false,
}: {
  motif: ClientMotif;
  onChange: (m: ClientMotif) => void;
  onAdd?: () => void;
  onRemove?: () => void;
  isNew?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-border last:border-0 ${!motif.enabled ? "opacity-50" : ""}`}>
      {/* Toggle */}
      <button
        onClick={() => onChange({ ...motif, enabled: !motif.enabled })}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
          motif.enabled ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
            motif.enabled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>

      {/* Label editable */}
      <input
        value={motif.label}
        onChange={(e) => onChange({ ...motif, label: e.target.value })}
        placeholder="Libellé du motif"
        className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      {/* Code (readonly for existing, editable for new) */}
      <input
        value={motif.code}
        readOnly={!isNew}
        onChange={isNew ? (e) => onChange({ ...motif, code: e.target.value.toUpperCase().replace(/\s/g,"_") }) : undefined}
        placeholder="CODE_MOTIF"
        className={`w-48 rounded-lg border border-border px-3 py-1.5 text-xs font-mono focus:outline-none ${
          isNew ? "bg-background focus:ring-2 focus:ring-primary/30" : "bg-muted text-muted-foreground"
        }`}
      />

      {/* Flags */}
      <div className="w-48 hidden xl:block">
        <ClientMotifFlags m={motif} />
      </div>

      {/* Remove / Add */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition"
          title="Supprimer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {onAdd && (
        <button
          onClick={onAdd}
          className="shrink-0 rounded-lg p-1.5 text-primary hover:bg-primary/10 transition"
          title="Ajouter"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Client section ─────────────────────────────────────────────────────────────

function ClientMotifsSection() {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"avant" | "apres">("avant");
  const [cfg, setCfg] = useState<ClientMotifsConfig>(DEFAULT_CLIENT);
  const [newMotif, setNewMotif] = useState<ClientMotif>({ code: "", label: "", enabled: true });

  const { data: loadedCfg, isPending } = useQuery({
    queryKey: ["admin-setting", CLIENT_KEY],
    queryFn: () => getSettingByKey(CLIENT_KEY),
    select: (raw) => {
      if (!raw) return null;
      try { return JSON.parse(raw.valueJson ?? "null"); } catch { return null; }
    },
  });

  useEffect(() => {
    if (loadedCfg) setCfg({ ...DEFAULT_CLIENT, ...loadedCfg });
  }, [loadedCfg]);

  const saveMut = useMutation({
    mutationFn: () =>
      putSetting(CLIENT_KEY, JSON.stringify(cfg), false, "Motifs de réclamation client"),
    onSuccess: () => {
      toast.success("Motifs client sauvegardés");
      qc.invalidateQueries({ queryKey: ["admin-setting", CLIENT_KEY] });
    },
    onError: (e: any) => toast.error("Erreur", e?.message),
  });

  const list = tab === "avant" ? cfg.avantLivre : cfg.apresLivre;
  const setList = (l: ClientMotif[]) =>
    setCfg((prev) =>
      tab === "avant" ? { ...prev, avantLivre: l } : { ...prev, apresLivre: l }
    );

  const update = (i: number, m: ClientMotif) => {
    const next = [...list];
    next[i] = m;
    setList(next);
  };

  const remove = (i: number) => setList(list.filter((_, idx) => idx !== i));

  const add = () => {
    if (!newMotif.code || !newMotif.label) {
      toast.error("Code et libellé obligatoires");
      return;
    }
    if (list.some((m) => m.code === newMotif.code)) {
      toast.error("Ce code existe déjà");
      return;
    }
    setList([...list, { ...newMotif }]);
    setNewMotif({ code: "", label: "", enabled: true });
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {(["avant", "apres"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              tab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "avant" ? "Avant livraison" : "Après livraison"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            {tab === "avant" ? "Motifs disponibles avant livraison" : "Motifs disponibles après livraison"}
          </span>
          <span className="text-xs text-muted-foreground">{list.filter((m) => m.enabled).length} / {list.length} actifs</span>
        </div>

        <div className="px-6">
          {isPending ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : (
            <>
              {list.map((m, i) => (
                <ClientMotifRow
                  key={m.code}
                  motif={m}
                  onChange={(updated) => update(i, updated)}
                  onRemove={() => remove(i)}
                />
              ))}

              {/* New motif row */}
              <div className="py-3 border-t border-dashed border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Ajouter un motif</p>
                <ClientMotifRow
                  motif={newMotif}
                  onChange={setNewMotif}
                  onAdd={add}
                  isNew
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {saveMut.isPending ? "Enregistrement…" : "Enregistrer motifs client"}
        </button>
      </div>
    </div>
  );
}

// ── Livreur section ────────────────────────────────────────────────────────────

function LivreurMotifsSection() {
  const toast = useToast();
  const qc = useQueryClient();
  const [motifs, setMotifs] = useState<LivreurMotif[]>(DEFAULT_LIVREUR);

  const { data: loadedMotifs, isPending } = useQuery({
    queryKey: ["admin-setting", LIVREUR_KEY],
    queryFn: () => getSettingByKey(LIVREUR_KEY),
    select: (raw) => {
      if (!raw) return null;
      try { return JSON.parse(raw.valueJson ?? "null"); } catch { return null; }
    },
  });

  useEffect(() => {
    if (Array.isArray(loadedMotifs)) setMotifs(loadedMotifs);
  }, [loadedMotifs]);

  const saveMut = useMutation({
    mutationFn: () =>
      putSetting(LIVREUR_KEY, JSON.stringify(motifs), false, "Motifs de réclamation livreur"),
    onSuccess: () => {
      toast.success("Motifs livreur sauvegardés");
      qc.invalidateQueries({ queryKey: ["admin-setting", LIVREUR_KEY] });
    },
    onError: (e: any) => toast.error("Erreur", e?.message),
  });

  const update = (i: number, m: LivreurMotif) => {
    const next = [...motifs];
    next[i] = m;
    setMotifs(next);
  };

  const groupLabel = (m: LivreurMotif) => {
    if (m.deferred) return "Différé";
    if (m.immediate === "A") return "Groupe A";
    if (m.immediate === "B") return "Groupe B";
    return "—";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Motifs livreur</span>
          <span className="text-xs text-muted-foreground">{motifs.filter((m) => m.enabled).length} / {motifs.length} actifs</span>
        </div>

        <div className="px-6">
          {isPending ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : (
            motifs.map((m, i) => (
              <div
                key={m.code}
                className={`flex items-start gap-3 py-3 border-b border-border last:border-0 ${!m.enabled ? "opacity-50" : ""}`}
              >
                {/* Toggle */}
                <button
                  onClick={() => update(i, { ...m, enabled: !m.enabled })}
                  className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    m.enabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      m.enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>

                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Label editable */}
                  <input
                    value={m.label}
                    onChange={(e) => update(i, { ...m, label: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />

                  <div className="flex items-center gap-3">
                    {/* Code (readonly) */}
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      {m.code}
                    </span>
                    {/* Group */}
                    <span className="text-xs text-muted-foreground">
                      Escalade : <strong>{groupLabel(m)}</strong>
                    </span>
                  </div>

                  <LivreurMotifFlags m={m} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">Règle d'escalade :</span> Les flags comportementaux
        (différé, groupes A/B, visibilité client) sont liés à la logique métier et ne peuvent être
        modifiés ici. Seul le libellé affiché et l'activation sont éditables.
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {saveMut.isPending ? "Enregistrement…" : "Enregistrer motifs livreur"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminReclamationMotifsPage() {
  const [activeTab, setActiveTab] = useState<"client" | "livreur">("client");

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-foreground">Réclamations — Motifs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez les motifs disponibles pour les réclamations clients et livreurs.
          Vous pouvez activer/désactiver et renommer chaque motif.
        </p>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 rounded-2xl border border-border bg-muted/30 p-1">
        {(["client", "livreur"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === t
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "client" ? "Côté Client" : "Côté Livreur"}
          </button>
        ))}
      </div>

      {activeTab === "client" ? <ClientMotifsSection /> : <LivreurMotifsSection />}
    </div>
  );
}
