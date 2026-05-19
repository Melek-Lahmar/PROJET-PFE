import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { getGouvernorats, getDelegations } from "../../geo/api/geoApi";
import { getDepots } from "../../catalog/api/depotsApi";

type Zone = {
  gouvernorat: string;
  delegation: string;
};

type Livreur = {
  id: string;
  email: string;
  fullName: string;
  telephone?: string | null;
  gouvernorat?: string | null;
  gouvernoratId?: number | null;
  delegation?: string | null;
  isTransit: boolean;
  depotRattacheNo?: number | null;
  depotRattacheName?: string | null;
  zones: Zone[];
};

type LivreurForm = {
  email: string;
  password: string;
  fullName: string;
  telephone: string;
  gouvernoratId: number;
  delegation: string;
  isTransit: boolean;
  depotRattacheNo: number | "";
  zones: Zone[];
};

type TypeFilter = "ALL" | "CLASSIQUE" | "TRANSIT";

const DEFAULT_GOUVERNORAT_ID = 22;

const emptyForm: LivreurForm = {
  email: "",
  password: "12345678",
  fullName: "",
  telephone: "+216",
  gouvernoratId: DEFAULT_GOUVERNORAT_ID,
  delegation: "",
  isTransit: false,
  depotRattacheNo: "",
  zones: [],
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function getLivreurTypeLabel(livreur: Livreur) {
  return livreur.isTransit ? "Livreur-transit" : "Livreur classique";
}

function getLivreurTypeClass(livreur: Livreur) {
  return livreur.isTransit
    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200"
    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200";
}

export function SupervisorZonesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [filterGouvernoratId, setFilterGouvernoratId] = useState<number | "">("");
  const [filterDelegation, setFilterDelegation] = useState("");
  const [filterDepotNo, setFilterDepotNo] = useState<number | "">("");

  const [modalMode, setModalMode] = useState<"closed" | "create" | "edit">("closed");
  const [selectedLivreur, setSelectedLivreur] = useState<Livreur | null>(null);
  const [form, setForm] = useState<LivreurForm>(emptyForm);

  const [zoneGovId, setZoneGovId] = useState<number>(DEFAULT_GOUVERNORAT_ID);
  const [zoneDelegation, setZoneDelegation] = useState("");

  const livreursQuery = useQuery({
    queryKey: ["supervisor", "livreurs"],
    queryFn: async () => {
      const { data } = await axiosClient.get<Livreur[]>(endpoints.supervisorLivreurs);
      return data;
    },
  });

  const gouvernoratsQuery = useQuery({
    queryKey: ["geo", "gouvernorats"],
    queryFn: getGouvernorats,
  });

  const depotsQuery = useQuery({
    queryKey: ["supervisor", "depots"],
    queryFn: () => getDepots(false),
  });

  const filterDelegationsQuery = useQuery({
    queryKey: ["geo", "delegations", "filter", filterGouvernoratId],
    queryFn: () => getDelegations(Number(filterGouvernoratId)),
    enabled: typeof filterGouvernoratId === "number",
  });

  const formDelegationsQuery = useQuery({
    queryKey: ["geo", "delegations", "form", form.gouvernoratId],
    queryFn: () => getDelegations(form.gouvernoratId),
    enabled: Number.isFinite(form.gouvernoratId),
  });

  const zoneDelegationsQuery = useQuery({
    queryKey: ["geo", "delegations", "zone", zoneGovId],
    queryFn: () => getDelegations(zoneGovId),
    enabled: Number.isFinite(zoneGovId),
  });

  const livreurs = livreursQuery.data ?? [];
  const gouvernorats = gouvernoratsQuery.data ?? [];
  const depots = depotsQuery.data ?? [];

  const classiques = livreurs.filter((livreur) => !livreur.isTransit);
  const transits = livreurs.filter((livreur) => livreur.isTransit);

  const getGovName = (id: number | "") => {
    if (id === "") return "";
    return gouvernorats.find((gov) => gov.id === id)?.name ?? String(id);
  };

  const selectedFilterGovName = getGovName(filterGouvernoratId);
  const selectedZoneGovName = getGovName(zoneGovId);

  const depotLabel = (depotNo?: number | null, fallback?: string | null) => {
    if (fallback) return fallback;

    const depot = depots.find((item) => item.dE_No === depotNo);
    if (depot) {
      return `${depot.dE_Intitule ?? `Dépôt ${depot.dE_No}`}${depot.dE_Ville ? ` — ${depot.dE_Ville}` : ""}`;
    }

    return depotNo ? `Dépôt ${depotNo}` : "Non affecté";
  };

  const filteredLivreurs = useMemo(() => {
    const q = normalizeText(search);
    const gov = normalizeText(selectedFilterGovName);
    const delegation = normalizeText(filterDelegation);

    return livreurs.filter((livreur) => {
      const zones = livreur.zones ?? [];

      const matchesSearch =
        !q ||
        normalizeText(livreur.fullName).includes(q) ||
        normalizeText(livreur.email).includes(q) ||
        normalizeText(livreur.telephone).includes(q);

      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "CLASSIQUE" && !livreur.isTransit) ||
        (typeFilter === "TRANSIT" && livreur.isTransit);

      const matchesGov =
        !gov ||
        normalizeText(livreur.gouvernorat).includes(gov) ||
        zones.some((zone) => normalizeText(zone.gouvernorat).includes(gov));

      const matchesDelegation =
        !delegation ||
        normalizeText(livreur.delegation).includes(delegation) ||
        zones.some((zone) => normalizeText(zone.delegation).includes(delegation));

      const matchesDepot =
        filterDepotNo === "" ||
        (livreur.isTransit && Number(livreur.depotRattacheNo) === Number(filterDepotNo));

      return matchesSearch && matchesType && matchesGov && matchesDelegation && matchesDepot;
    });
  }, [livreurs, search, selectedFilterGovName, filterDelegation, typeFilter, filterDepotNo]);

  const openCreateModal = () => {
    setSelectedLivreur(null);
    setForm(emptyForm);
    setZoneGovId(DEFAULT_GOUVERNORAT_ID);
    setZoneDelegation("");
    setModalMode("create");
  };

  const openDetailModal = (livreur: Livreur) => {
    setSelectedLivreur(livreur);
    setForm({
      email: livreur.email ?? "",
      password: "12345678",
      fullName: livreur.fullName ?? "",
      telephone: livreur.telephone ?? "+216",
      gouvernoratId: livreur.gouvernoratId ?? DEFAULT_GOUVERNORAT_ID,
      delegation: livreur.delegation ?? "",
      isTransit: livreur.isTransit,
      depotRattacheNo: livreur.depotRattacheNo ?? "",
      zones: livreur.zones ?? [],
    });
    setZoneGovId(livreur.gouvernoratId ?? DEFAULT_GOUVERNORAT_ID);
    setZoneDelegation("");
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode("closed");
    setSelectedLivreur(null);
    setForm(emptyForm);
    setZoneGovId(DEFAULT_GOUVERNORAT_ID);
    setZoneDelegation("");
  };

  const addZone = () => {
    const gouvernorat = cleanText(selectedZoneGovName);
    const delegation = cleanText(zoneDelegation);

    if (!gouvernorat || !delegation) return;

    setForm((previous) => {
      const exists = previous.zones.some(
        (zone) =>
          normalizeText(zone.gouvernorat) === normalizeText(gouvernorat) &&
          normalizeText(zone.delegation) === normalizeText(delegation)
      );

      if (exists) return previous;

      return {
        ...previous,
        zones: [...previous.zones, { gouvernorat, delegation }],
      };
    });

    setZoneDelegation("");
  };

  const removeZone = (index: number) => {
    setForm((previous) => ({
      ...previous,
      zones: previous.zones.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nomComplet: form.fullName.trim(),
        telephone: form.telephone.trim(),
        gouvernorat: form.gouvernoratId,
        delegation: form.delegation.trim(),
        isTransit: form.isTransit,
        depotRattacheNo:
          form.isTransit && form.depotRattacheNo !== ""
            ? Number(form.depotRattacheNo)
            : null,
        zones: form.isTransit
          ? []
          : form.zones.map((zone) => ({
              gouvernorat: zone.gouvernorat.trim(),
              delegation: zone.delegation.trim(),
            })),
      };

      if (modalMode === "edit" && selectedLivreur) {
        await axiosClient.put(endpoints.supervisorLivreurById(selectedLivreur.id), payload);
        return;
      }

      await axiosClient.post(endpoints.supervisorLivreurs, {
        email: form.email.trim(),
        password: form.password.trim(),
        ...payload,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["supervisor", "livreurs"] });
      closeModal();
    },
  });

  const identityValid =
    modalMode === "edit" ||
    (form.email.trim().length > 3 && form.password.trim().length >= 6);

  const baseInfoValid =
    identityValid &&
    form.fullName.trim().length > 0 &&
    form.telephone.trim().length > 0 &&
    form.gouvernoratId &&
    form.delegation.trim().length > 0;

  const canSave = form.isTransit
    ? Boolean(baseInfoValid && form.depotRattacheNo !== "")
    : Boolean(baseInfoValid && form.zones.length > 0);

  return (
    <main className="min-h-screen space-y-6 bg-background p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
            Espace superviseur
          </p>
          <h1 className="text-2xl font-black text-foreground">Gestion des livreurs</h1>
          <p className="mt-1 max-w-4xl text-sm text-muted-foreground">
            Cette page affiche uniquement la liste des livreurs. Le superviseur clique sur
            le détail d’un livreur pour modifier ses coordonnées, ses zones de livraison
            ou son dépôt de transit.
          </p>
        </div>

        <Button type="button" variant="primary" onClick={openCreateModal} className="rounded-2xl">
          + Ajouter un livreur
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground">Livreurs totaux</p>
          <p className="mt-2 text-3xl font-black">{livreurs.length}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground">Livreurs classiques</p>
          <p className="mt-2 text-3xl font-black">{classiques.length}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-muted-foreground">Livreurs-transit</p>
          <p className="mt-2 text-3xl font-black">{transits.length}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-black">Recherche et filtres</h2>
          <p className="text-sm text-muted-foreground">
            Filtrez les livreurs par nom, type, gouvernorat, délégation ou dépôt rattaché.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
              Recherche
            </label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, email ou téléphone"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground"
            >
              <option value="ALL">Tous</option>
              <option value="CLASSIQUE">Livreurs classiques</option>
              <option value="TRANSIT">Livreurs-transit</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
              Gouvernorat
            </label>
            <select
              value={filterGouvernoratId}
              onChange={(event) => {
                const value = event.target.value;
                setFilterGouvernoratId(value ? Number(value) : "");
                setFilterDelegation("");
              }}
              className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground"
            >
              <option value="">Tous</option>
              {gouvernorats.map((gov) => (
                <option key={gov.id} value={gov.id}>
                  {gov.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
              Délégation
            </label>
            <select
              value={filterDelegation}
              onChange={(event) => setFilterDelegation(event.target.value)}
              disabled={filterGouvernoratId === ""}
              className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground disabled:opacity-50"
            >
              <option value="">Toutes</option>
              {(filterDelegationsQuery.data ?? []).map((delegation) => (
                <option key={delegation} value={delegation}>
                  {delegation}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
              Dépôt transit
            </label>
            <select
              value={filterDepotNo}
              onChange={(event) => {
                const value = event.target.value;
                setFilterDepotNo(value ? Number(value) : "");
              }}
              className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground"
            >
              <option value="">Tous</option>
              {depots.map((depot) => (
                <option key={depot.dE_No} value={depot.dE_No}>
                  {depot.dE_Intitule ?? `Dépôt ${depot.dE_No}`}
                  {depot.dE_Ville ? ` — ${depot.dE_Ville}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-2xl"
              onClick={() => {
                setSearch("");
                setTypeFilter("ALL");
                setFilterGouvernoratId("");
                setFilterDelegation("");
                setFilterDepotNo("");
              }}
            >
              Réinitialiser les filtres
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black">Liste des livreurs</h2>
            <p className="text-sm text-muted-foreground">
              {filteredLivreurs.length} livreur(s) affiché(s) sur {livreurs.length}.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => livreursQuery.refetch()}
            isLoading={livreursQuery.isFetching}
          >
            Recharger
          </Button>
        </div>

        {livreursQuery.isLoading && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm font-semibold text-muted-foreground">
            Chargement des livreurs...
          </div>
        )}

        {livreursQuery.isError && (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">
            Erreur lors du chargement des livreurs.
          </div>
        )}

        {!livreursQuery.isLoading && filteredLivreurs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-lg font-black">Aucun livreur trouvé</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Changez les filtres ou ajoutez un nouveau livreur.
            </p>
          </div>
        )}

        <div className="grid gap-4">
          {filteredLivreurs.map((livreur) => (
            <article
              key={livreur.id}
              className="rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black">{livreur.fullName}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${getLivreurTypeClass(
                        livreur
                      )}`}
                    >
                      {getLivreurTypeLabel(livreur)}
                    </span>
                  </div>

                  <div className="mt-2 grid gap-1 text-sm text-muted-foreground md:grid-cols-3">
                    <p>
                      <span className="font-bold text-foreground">Email : </span>
                      {livreur.email}
                    </p>
                    <p>
                      <span className="font-bold text-foreground">Téléphone : </span>
                      {livreur.telephone || "Non renseigné"}
                    </p>
                    <p>
                      <span className="font-bold text-foreground">Zone principale : </span>
                      {livreur.gouvernorat || "—"} / {livreur.delegation || "—"}
                    </p>
                  </div>

                  {livreur.isTransit ? (
                    <div className="mt-4 rounded-2xl bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100">
                      <span className="font-black">Dépôt rattaché : </span>
                      {depotLabel(livreur.depotRattacheNo, livreur.depotRattacheName)}
                      <p className="mt-1 text-xs">
                        Ce livreur ne livre pas les clients. Il déplace les articles entre dépôts.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Zones exactes affectées
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {livreur.zones?.length ? (
                          livreur.zones.map((zone, index) => (
                            <span
                              key={`${livreur.id}-${zone.gouvernorat}-${zone.delegation}-${index}`}
                              className="rounded-full bg-muted px-3 py-1 text-sm font-bold text-foreground"
                            >
                              {zone.gouvernorat} / {zone.delegation}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800">
                            Aucune zone : aucun BL ne doit s’afficher
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => openDetailModal(livreur)}
                  >
                    Détail / gérer
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {modalMode !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-card/95 p-5 backdrop-blur">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
                  {modalMode === "create" ? "Nouveau livreur" : "Fiche livreur"}
                </p>
                <h2 className="text-xl font-black">
                  {modalMode === "create"
                    ? "Ajouter un livreur"
                    : selectedLivreur?.fullName || "Détail livreur"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Modifiez les coordonnées, les zones exactes ou le dépôt rattaché.
                </p>
              </div>

              <Button type="button" variant="ghost" size="icon" onClick={closeModal}>
                ×
              </Button>
            </header>

            <div className="grid gap-5 p-5 xl:grid-cols-[0.85fr_1.15fr]">
              <aside className="space-y-4">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-black">Résumé</p>

                  <div className="mt-3 space-y-2 text-sm">
                    <p>
                      <span className="font-bold">Type : </span>
                      {form.isTransit ? "Livreur-transit" : "Livreur classique"}
                    </p>

                    <p>
                      <span className="font-bold">Email : </span>
                      {modalMode === "create" ? form.email || "À saisir" : selectedLivreur?.email}
                    </p>

                    <p>
                      <span className="font-bold">Téléphone : </span>
                      {form.telephone || "Non renseigné"}
                    </p>

                    <p>
                      <span className="font-bold">Zone principale : </span>
                      {getGovName(form.gouvernoratId)} / {form.delegation || "—"}
                    </p>

                    {form.isTransit ? (
                      <p>
                        <span className="font-bold">Dépôt : </span>
                        {form.depotRattacheNo !== ""
                          ? depotLabel(Number(form.depotRattacheNo), null)
                          : "Non affecté"}
                      </p>
                    ) : (
                      <p>
                        <span className="font-bold">Nombre de zones : </span>
                        {form.zones.length}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-black">Règle métier</p>

                  {form.isTransit ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Un livreur-transit est un utilisateur avec rôle LIVREUR et
                      IsTransit = true. Il est rattaché à un dépôt et sert uniquement à
                      déplacer les produits entre les dépôts.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Un livreur classique voit uniquement les BL dont le gouvernorat et
                      la délégation correspondent exactement à l’une de ses zones.
                    </p>
                  )}
                </div>
              </aside>

              <div className="space-y-5">
                {modalMode === "create" && (
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <h3 className="mb-3 text-base font-black">Compte utilisateur</h3>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                          Email
                        </label>
                        <Input
                          value={form.email}
                          onChange={(event) =>
                            setForm((previous) => ({ ...previous, email: event.target.value }))
                          }
                          placeholder="livreur@pfe.tn"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                          Mot de passe
                        </label>
                        <Input
                          type="password"
                          value={form.password}
                          onChange={(event) =>
                            setForm((previous) => ({ ...previous, password: event.target.value }))
                          }
                          placeholder="12345678"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-background p-4">
                  <h3 className="mb-3 text-base font-black">Coordonnées du livreur</h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Nom complet
                      </label>
                      <Input
                        value={form.fullName}
                        onChange={(event) =>
                          setForm((previous) => ({ ...previous, fullName: event.target.value }))
                        }
                        placeholder="Nom et prénom"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Téléphone
                      </label>
                      <Input
                        value={form.telephone}
                        onChange={(event) =>
                          setForm((previous) => ({ ...previous, telephone: event.target.value }))
                        }
                        placeholder="+21622123456"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <h3 className="mb-3 text-base font-black">Type du livreur</h3>

                  <div className="grid gap-2 md:grid-cols-2">
                    <Button
                      type="button"
                      variant={!form.isTransit ? "primary" : "outline"}
                      onClick={() =>
                        setForm((previous) => ({
                          ...previous,
                          isTransit: false,
                          depotRattacheNo: "",
                        }))
                      }
                    >
                      Livreur classique
                    </Button>

                    <Button
                      type="button"
                      variant={form.isTransit ? "primary" : "outline"}
                      onClick={() =>
                        setForm((previous) => ({
                          ...previous,
                          isTransit: true,
                          zones: [],
                        }))
                      }
                    >
                      Livreur-transit
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <h3 className="mb-3 text-base font-black">Zone principale du profil</h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Gouvernorat
                      </label>
                      <select
                        value={form.gouvernoratId}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            gouvernoratId: Number(event.target.value),
                            delegation: "",
                          }))
                        }
                        className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground"
                      >
                        {gouvernorats.map((gov) => (
                          <option key={gov.id} value={gov.id}>
                            {gov.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                        Délégation
                      </label>
                      <select
                        value={form.delegation}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            delegation: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground"
                      >
                        <option value="">Choisir une délégation</option>
                        {(formDelegationsQuery.data ?? []).map((delegation) => (
                          <option key={delegation} value={delegation}>
                            {delegation}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {form.isTransit ? (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
                    <h3 className="mb-3 text-base font-black">Affectation dépôt transit</h3>

                    <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                      Dépôt rattaché
                    </label>

                    <select
                      value={form.depotRattacheNo}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          depotRattacheNo: event.target.value ? Number(event.target.value) : "",
                        }))
                      }
                      className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground"
                    >
                      <option value="">Choisir un dépôt</option>
                      {depots.map((depot) => (
                        <option key={depot.dE_No} value={depot.dE_No}>
                          {depot.dE_Intitule ?? `Dépôt ${depot.dE_No}`}
                          {depot.dE_Ville ? ` — ${depot.dE_Ville}` : ""}
                        </option>
                      ))}
                    </select>

                    <p className="mt-2 text-sm text-indigo-800 dark:text-indigo-100">
                      Pour la logique PFE actuelle, chaque dépôt peut avoir son propre livreur-transit.
                      Ce livreur déplace les articles entre le dépôt source et le dépôt destinataire.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <h3 className="text-base font-black">Zones exactes de livraison</h3>
                    <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-100">
                      Ces zones déterminent les BL visibles par le livreur. Le BL doit avoir le même
                      gouvernorat et la même délégation.
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <div>
                        <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                          Gouvernorat
                        </label>
                        <select
                          value={zoneGovId}
                          onChange={(event) => {
                            setZoneGovId(Number(event.target.value));
                            setZoneDelegation("");
                          }}
                          className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground"
                        >
                          {gouvernorats.map((gov) => (
                            <option key={gov.id} value={gov.id}>
                              {gov.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                          Délégation
                        </label>
                        <select
                          value={zoneDelegation}
                          onChange={(event) => setZoneDelegation(event.target.value)}
                          className="h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground"
                        >
                          <option value="">Choisir une délégation</option>
                          {(zoneDelegationsQuery.data ?? []).map((delegation) => (
                            <option key={delegation} value={delegation}>
                              {delegation}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-2xl"
                          onClick={addZone}
                          disabled={!zoneDelegation}
                        >
                          Ajouter
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-card p-3">
                      <p className="mb-2 text-sm font-black">Zones affectées</p>

                      {form.zones.length === 0 ? (
                        <p className="rounded-2xl bg-amber-100 p-3 text-sm font-bold text-amber-800">
                          Aucune zone affectée. Ce livreur ne doit voir aucun BL.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {form.zones.map((zone, index) => (
                            <button
                              key={`${zone.gouvernorat}-${zone.delegation}-${index}`}
                              type="button"
                              onClick={() => removeZone(index)}
                              className="rounded-full bg-muted px-3 py-1 text-sm font-bold text-foreground transition hover:bg-rose-100 hover:text-rose-700"
                              title="Cliquer pour supprimer cette zone"
                            >
                              {zone.gouvernorat} / {zone.delegation} ×
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {saveMutation.isError && (
                  <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">
                    Erreur lors de l’enregistrement. Vérifiez les champs obligatoires et réessayez.
                  </div>
                )}
              </div>
            </div>

            <footer className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-card/95 p-5 backdrop-blur md:flex-row md:items-center md:justify-end">
              <Button type="button" variant="outline" onClick={closeModal}>
                Annuler
              </Button>

              <Button
                type="button"
                variant="primary"
                disabled={!canSave || saveMutation.isPending}
                isLoading={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Enregistrer
              </Button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}