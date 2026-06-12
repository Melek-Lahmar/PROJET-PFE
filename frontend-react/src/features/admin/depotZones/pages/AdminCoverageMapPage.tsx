import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDepots } from "../../../catalog/api/depotsApi";
import { getDelegations, getGouvernorats } from "../../../geo/api/geoApi";
import { Input } from "../../../../shared/components/Input";
import { Loader } from "../../../../shared/components/Loader";
import { PremiumHero } from "../../../../shared/components/premium";
import { listDepotZones } from "../api/depotZonesApi";

type GovernorateStatus = {
  id: number;
  name: string;
  coveredDelegations: string[];
  activeDepotNos: number[];
};

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sortLabels(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

export function AdminCoverageMapPage() {
  const [selectedGovId, setSelectedGovId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const zonesQuery = useQuery({ queryKey: ["admin-depot-zones"], queryFn: listDepotZones });
  const gouvernoratsQuery = useQuery({ queryKey: ["geo-gouvernorats"], queryFn: getGouvernorats, staleTime: 5 * 60_000 });
  const depotsQuery = useQuery({ queryKey: ["depots"], queryFn: () => getDepots(false), staleTime: 5 * 60_000 });

  const governorateStatuses = useMemo<GovernorateStatus[]>(() => {
    const gouvernorats = gouvernoratsQuery.data ?? [];
    const zones = zonesQuery.data ?? [];
    const byGov = new Map<string, { delegations: Set<string>; depots: Set<number> }>();

    for (const zone of zones) {
      const key = normalizeLabel(zone.gouvernorat);
      const entry = byGov.get(key) ?? { delegations: new Set<string>(), depots: new Set<number>() };
      entry.delegations.add(zone.delegation);
      entry.depots.add(zone.depotNo);
      byGov.set(key, entry);
    }

    return gouvernorats.map((gov) => {
      const entry = byGov.get(normalizeLabel(gov.name));
      return {
        id: gov.id,
        name: gov.name,
        coveredDelegations: sortLabels(Array.from(entry?.delegations ?? [])),
        activeDepotNos: Array.from(entry?.depots ?? []).sort((a, b) => a - b),
      };
    });
  }, [gouvernoratsQuery.data, zonesQuery.data]);

  const filteredGovernorates = useMemo(() => {
    const depots = depotsQuery.data ?? [];
    const term = normalizeLabel(search);
    if (!term) return governorateStatuses;
    return governorateStatuses.filter((gov) => {
      const depotsForGov = gov.activeDepotNos
        .map((depotNo) => depots.find((item) => item.dE_No === depotNo)?.dE_Intitule ?? `Dépôt ${depotNo}`)
        .join(" ");
      return (
        normalizeLabel(gov.name).includes(term)
        || gov.coveredDelegations.some((delegation) => normalizeLabel(delegation).includes(term))
        || normalizeLabel(depotsForGov).includes(term)
      );
    });
  }, [depotsQuery.data, governorateStatuses, search]);

  const resolvedSelectedGovId = selectedGovId ?? filteredGovernorates[0]?.id ?? null;

  const selectedGovernorate = useMemo(
    () => governorateStatuses.find((gov) => gov.id === resolvedSelectedGovId) ?? null,
    [governorateStatuses, resolvedSelectedGovId]
  );

  const delegationsQuery = useQuery({
    queryKey: ["geo-delegations", resolvedSelectedGovId],
    queryFn: () => getDelegations(resolvedSelectedGovId as number),
    enabled: typeof resolvedSelectedGovId === "number",
    staleTime: 5 * 60_000,
  });

  const uncoveredDelegations = useMemo(() => {
    if (!selectedGovernorate) return [];
    const covered = new Set(selectedGovernorate.coveredDelegations.map(normalizeLabel));
    return sortLabels((delegationsQuery.data ?? []).filter((delegation) => !covered.has(normalizeLabel(delegation))));
  }, [delegationsQuery.data, selectedGovernorate]);

  const uniqueCoveredDelegations = useMemo(() => {
    const zones = zonesQuery.data ?? [];
    const keys = new Set(zones.map((zone) => `${normalizeLabel(zone.gouvernorat)}::${normalizeLabel(zone.delegation)}`));
    return keys.size;
  }, [zonesQuery.data]);

  const uniqueCoveredGovernorates = governorateStatuses.filter((gov) => gov.coveredDelegations.length > 0).length;
  const activeDepotCount = useMemo(() => {
    const zones = zonesQuery.data ?? [];
    return new Set(zones.map((zone) => zone.depotNo)).size;
  }, [zonesQuery.data]);

  const depotLabel = (depotNo: number) => {
    const depots = depotsQuery.data ?? [];
    const depot = depots.find((item) => item.dE_No === depotNo);
    if (!depot) return `Dépôt ${depotNo}`;
    return depot.dE_Intitule ? `${depot.dE_Intitule}${depot.dE_Ville ? ` - ${depot.dE_Ville}` : ""}` : `Dépôt ${depotNo}`;
  };

  if (zonesQuery.isPending || gouvernoratsQuery.isPending || depotsQuery.isPending) {
    return <Loader label="Chargement de la couverture..." />;
  }

  if (zonesQuery.isError || gouvernoratsQuery.isError || depotsQuery.isError) {
    return (
      <div className="space-y-6 pb-10">
        <PremiumHero
          kicker="Logistique"
          title="Carte de couverture dynamique"
          description="Impossible de charger les zones de livraison configurées depuis la base."
        />
        <div className="ds-alert ds-alert-danger">
          Vérifiez le chargement des zones, des dépôts et du référentiel géographique.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PremiumHero
        kicker="Logistique"
        title="Carte de couverture dynamique"
        description="Cette vue reflète directement les affectations dépôt-zone enregistrées en base. Elle met en évidence les délégations couvertes et les écarts de couverture."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <article className="app-surface p-5">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Couverture</div>
          <div className="mt-3 text-3xl font-black text-card-foreground">{uniqueCoveredDelegations}</div>
          <p className="mt-2 text-sm text-muted-foreground">Délégations couvertes en base.</p>
        </article>
        <article className="app-surface p-5">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Gouvernorats</div>
          <div className="mt-3 text-3xl font-black text-card-foreground">{uniqueCoveredGovernorates}</div>
          <p className="mt-2 text-sm text-muted-foreground">Gouvernorats avec au moins une zone active.</p>
        </article>
        <article className="app-surface p-5">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Dépôts</div>
          <div className="mt-3 text-3xl font-black text-card-foreground">{activeDepotCount}</div>
          <p className="mt-2 text-sm text-muted-foreground">Dépôts réellement utilisés dans la couverture.</p>
        </article>
        <article className="app-surface p-5">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Écarts visibles</div>
          <div className="mt-3 text-3xl font-black text-card-foreground">{selectedGovernorate ? uncoveredDelegations.length : 0}</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedGovernorate ? `Délégations non couvertes dans ${selectedGovernorate.name}.` : "Sélectionnez un gouvernorat pour voir les écarts."}
          </p>
        </article>
      </section>

      <section className="app-surface p-5 md:p-6">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un gouvernorat, une délégation ou un dépôt"
            aria-label="Recherche couverture"
          />
          <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
            {filteredGovernorates.length} gouvernorat(s) affiché(s)
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="app-surface p-5 md:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-card-foreground">Synthèse par gouvernorat</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Les cartes ci-dessous sont calculées à partir des lignes présentes dans `F_DEPOT_ZONES`.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredGovernorates.map((gov) => {
              const selected = gov.id === resolvedSelectedGovId;
              return (
                <button
                  key={gov.id}
                  type="button"
                  onClick={() => setSelectedGovId(gov.id)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    selected
                      ? "border-primary/40 bg-primary/8 shadow-[0_22px_50px_-32px_hsl(var(--primary)/0.65)]"
                      : "border-border bg-card hover:border-primary/20 hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-extrabold text-card-foreground">{gov.name}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        {gov.coveredDelegations.length > 0 ? "Couvert" : "Sans couverture"}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      gov.coveredDelegations.length > 0
                        ? "bg-success/12 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {gov.coveredDelegations.length}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {gov.activeDepotNos.length > 0
                      ? `${gov.activeDepotNos.length} dépôt(s) affecté(s)`
                      : "Aucun dépôt affecté pour le moment."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {gov.activeDepotNos.slice(0, 3).map((depotNo) => (
                      <span key={depotNo} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-card-foreground">
                        {depotLabel(depotNo)}
                      </span>
                    ))}
                    {gov.activeDepotNos.length > 3 && (
                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        +{gov.activeDepotNos.length - 3} autre(s)
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="app-surface p-5 md:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-card-foreground">
              {selectedGovernorate ? selectedGovernorate.name : "Détail de couverture"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Comparaison entre les délégations enregistrées en base et le référentiel géographique.
            </p>
          </div>

          {!selectedGovernorate ? (
            <div className="rounded-2xl border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun gouvernorat disponible.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-success/20 bg-success/8 p-4">
                <div className="mb-3 text-sm font-bold text-success">Délégations couvertes en base</div>
                <div className="flex flex-wrap gap-2">
                  {selectedGovernorate.coveredDelegations.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Aucune délégation couverte pour ce gouvernorat.</span>
                  ) : (
                    selectedGovernorate.coveredDelegations.map((delegation) => (
                      <span key={delegation} className="rounded-full border border-success/25 bg-card px-3 py-1 text-xs font-semibold text-success">
                        {delegation}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="mb-3 text-sm font-bold text-card-foreground">Dépôts actifs pour {selectedGovernorate.name}</div>
                <div className="flex flex-wrap gap-2">
                  {selectedGovernorate.activeDepotNos.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Aucun dépôt rattaché à ce gouvernorat.</span>
                  ) : (
                    selectedGovernorate.activeDepotNos.map((depotNo) => (
                      <span key={depotNo} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-card-foreground">
                        {depotLabel(depotNo)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-warning/20 bg-warning/8 p-4">
                <div className="mb-3 text-sm font-bold text-warning">Délégations à couvrir</div>
                {delegationsQuery.isPending ? (
                  <div className="text-sm text-muted-foreground">Chargement du référentiel de délégations...</div>
                ) : uncoveredDelegations.length === 0 ? (
                  <div className="text-sm font-semibold text-success">Couverture complète selon le référentiel chargé.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {uncoveredDelegations.map((delegation) => (
                      <span key={delegation} className="rounded-full border border-warning/25 bg-card px-3 py-1 text-xs font-semibold text-warning">
                        {delegation} - Non couverte
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
