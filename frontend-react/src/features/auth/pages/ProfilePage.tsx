import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { me, updateMyProfile } from "../api/authApi";
import { useAuthStore } from "../store/authStore";
import type { MeResponseDto } from "../types/auth";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { getDelegations } from "../../geo/api/geoApi";
import { reverseGeocodeNominatim } from "../../geo/api/nominatimApi";
import { fetchCenterByGovDelegation } from "../../geo/api/nominatimGeo";
import { getCenterForTunisia } from "../../geo/data/tunisiaCenters";
import { AddressMapField, type AddressMapChangeReason } from "../components/AddressMapField";
import { getVendeurContext } from "../../vendeur/api/vendeurApi";
import type { VendeurContextResponseDto } from "../../vendeur/types/vendeur";
import {
  buildAddressFromReverse,
  extractPostalCode,
  getGouvernoratLabelById,
  resolveDelegationFromReverse,
  resolveGouvernoratIdFromReverse,
  roundCoordinate,
  TUNISIA_GOUVERNORATS,
} from "../../geo/utils/tunisiaLocationSync";
import {
  EmptyView,
  PremiumHero,
} from "../../../shared/components/premium";

function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 22s7-4.5 7-12a7 7 0 0 0-14 0c0 7.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </svg>
  );
}

function IconStore(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 10.5 5 4h14l2 6.5" />
      <path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M9 20v-6h6v6" />
      <path d="M3 10.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 3-2.5" />
    </svg>
  );
}

function IconSync(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M20 11a8 8 0 0 0-14.9-4M4 13a8 8 0 0 0 14.9 4" />
      <path d="M4 4v4h4M20 20v-4h-4" />
    </svg>
  );
}

function safeText(value?: string | null, fallback = "-") {
  return value && value.trim() ? value.trim() : fallback;
}

function gouvernoratLabel(value?: number | null) {
  return typeof value === "number" && value >= 0 && value < TUNISIA_GOUVERNORATS.length
    ? TUNISIA_GOUVERNORATS[value]
    : "-";
}

function initialsFromEmail(email: string) {
  const value = (email ?? "").trim();
  if (!value) return "U";
  const at = value.indexOf("@");
  const left = (at > 0 ? value.slice(0, at) : value).replace(/[^a-zA-Z0-9]/g, "");
  if (left.length === 0) return "U";
  return left.slice(0, 2).toUpperCase();
}

function formatCoordinate(value: number | null) {
  return typeof value === "number" ? value.toFixed(6) : "";
}

function buildLocationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Impossible de synchroniser la localisation.";
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-[hsl(var(--input))] px-4 py-4 text-sm">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <span className="max-w-[260px] text-right font-semibold text-card-foreground">{safeText(value)}</span>
    </div>
  );
}

function VendeurProfilePanel({
  meData,
  vendeurContext,
  vendeurContextError,
}: {
  meData: MeResponseDto;
  vendeurContext?: VendeurContextResponseDto;
  vendeurContextError?: unknown;
}) {
  const profile = meData.profile;
  const depot = vendeurContext?.depot;

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
      <div className="space-y-6 lg:col-span-7">
        <div className="rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--input))] text-card-foreground shadow-sm ring-1 ring-border/60">
              <IconUser className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informations</div>
              <h2 className="text-lg font-extrabold text-card-foreground">Identité vendeur</h2>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
            <InfoRow label="Email" value={meData.email} />
            <InfoRow label="Nom complet" value={profile?.nomComplet} />
            <InfoRow label="Téléphone" value={profile?.telephone} />
            <InfoRow label="CIN" value={profile?.cin} />
            <InfoRow label="Code employé" value={profile?.codeEmploye} />
            <InfoRow label="Poste" value={profile?.poste} />
            <InfoRow label="Département" value={profile?.departement} />
            <InfoRow label="Gouvernorat" value={gouvernoratLabel(profile?.gouvernorat)} />
            <div className="md:col-span-2">
              <InfoRow label="Délégation" value={profile?.delegation} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 lg:col-span-5">
        <div className="rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--input))] text-card-foreground shadow-sm ring-1 ring-border/60">
              <IconStore className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Affectation</div>
              <h2 className="text-lg font-extrabold text-card-foreground">Dépôt vendeur</h2>
            </div>
          </div>

          <div className="space-y-4 px-6 py-6">
            {vendeurContextError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm text-amber-800">
                {getApiErrorMessage(vendeurContextError)}
              </div>
            ) : null}

            <InfoRow label="Code dépôt profil" value={profile?.codeDepot} />
            <InfoRow label="Intitulé dépôt" value={depot?.depotIntitule || profile?.codeDepot} />
            <InfoRow label="Code dépôt" value={depot?.depotCode} />
            <InfoRow label="Ville dépôt" value={depot?.city} />
            <InfoRow label="Code postal dépôt" value={depot?.postalCode} />
            <div className="rounded-2xl border border-border bg-[hsl(var(--input))] px-4 py-4 text-sm">
              <div className="font-semibold text-muted-foreground">Adresse dépôt</div>
              <div className="mt-2 font-semibold text-card-foreground">{safeText(depot?.address)}</div>
            </div>

            <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 text-sm text-card-foreground">
              Les adresses de livraison client et la localisation GPS précise sont masquées pour le rôle vendeur.
              Ce profil affiche uniquement les informations personnelles du vendeur et le dépôt auquel il est affecté.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const setMe = useAuthStore((s) => s.setMe);

  const q = useQuery({
    queryKey: ["me"],
    queryFn: () => me(),
  });

  const roles = q.data?.roles ?? [];
  const isVendeur = roles.includes("VENDEUR");
  const isConfirmateur = roles.includes("CONFIRMATEUR") || roles.includes("CONFIRMATRICE");
  const isAdmin = roles.includes("ADMIN");
  const isSuperviseur = roles.includes("SUPERVISEUR");

  // Rôles métier internes : affichent un profil simple sans onglets client
  const isStaffRole = isAdmin || isSuperviseur || isConfirmateur || isVendeur;

  const vendeurContextQuery = useQuery({
    queryKey: ["vendeur-context", "profile"],
    queryFn: getVendeurContext,
    enabled: isVendeur,
    staleTime: 60_000,
    retry: 1,
  });

  const [gouvernorat, setGouvernorat] = useState<number>(22);
  const [delegation, setDelegation] = useState<string>("");
  const [telephone, setTelephone] = useState<string>("");
  const [adresse, setAdresse] = useState<string>("");
  const [adresseComplementaire, setAdresseComplementaire] = useState<string>("");
  const [codePostal, setCodePostal] = useState<string>("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(11);
  const [locationStatus, setLocationStatus] = useState<"idle" | "gps" | "selection" | "reverse">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);

  const syncRequestRef = useRef(0);
  const didHydrateRef = useRef(false);

  const PAYS_FIXE = "Tunisie";

  useEffect(() => {
    const profile = q.data?.profile;
    if (!profile) return;

    didHydrateRef.current = true;
    setLocationError(null);

    if (typeof profile.gouvernorat === "number") {
      setGouvernorat(profile.gouvernorat);
      const fallbackCenter = getCenterForTunisia(profile.gouvernorat);
      setMapZoom(fallbackCenter.zoom);
    }

    setDelegation(profile.delegation ?? "");
    setTelephone(profile.telephone ?? "");
    setAdresse(profile.adresse ?? "");
    setAdresseComplementaire(profile.adresseComplementaire ?? "");
    setCodePostal(profile.codePostal ?? "");
    setLatitude(typeof profile.latitude === "number" ? profile.latitude : null);
    setLongitude(typeof profile.longitude === "number" ? profile.longitude : null);

    if (typeof profile.latitude === "number" && typeof profile.longitude === "number") {
      setMapZoom(16);
    } else if (profile.delegation?.trim()) {
      setMapZoom(14);
    }
  }, [q.data?.profile]);

  const delQuery = useQuery({
    queryKey: ["geo-delegations", gouvernorat],
    queryFn: () => getDelegations(gouvernorat),
    enabled: Number.isFinite(gouvernorat) && !isVendeur,
  });

  useEffect(() => {
    const list = delQuery.data ?? [];
    if (!didHydrateRef.current) return;
    if (!delegation.trim()) return;
    if (list.length === 0) return;
    if (!list.includes(delegation)) {
      setDelegation("");
    }
  }, [delQuery.data, delegation]);

  const synchronizeFromCoordinates = useCallback(
    async (
      lat: number,
      lng: number,
      options?: {
        keepSelectedRegion?: boolean;
        status?: "gps" | "selection" | "reverse";
        zoom?: number;
      }
    ) => {
      const requestId = ++syncRequestRef.current;
      const nextLat = roundCoordinate(lat);
      const nextLng = roundCoordinate(lng);

      setLatitude(nextLat);
      setLongitude(nextLng);
      setMapZoom(options?.zoom ?? 16);
      setLocationError(null);
      setLocationStatus(options?.status ?? "reverse");

      try {
        const reverse = await reverseGeocodeNominatim(nextLat, nextLng);
        if (requestId !== syncRequestRef.current) return;

        const nextAddress = buildAddressFromReverse(reverse);
        const nextPostalCode = extractPostalCode(reverse);

        if (nextAddress) setAdresse(nextAddress);
        if (nextPostalCode) setCodePostal(nextPostalCode);

        if (!options?.keepSelectedRegion) {
          const resolvedGouvernorat = resolveGouvernoratIdFromReverse(reverse);
          if (resolvedGouvernorat !== null) {
            setGouvernorat(resolvedGouvernorat);

            const delegations = await getDelegations(resolvedGouvernorat);
            if (requestId !== syncRequestRef.current) return;

            const resolvedDelegation = resolveDelegationFromReverse(reverse, delegations);
            if (resolvedDelegation) {
              setDelegation(resolvedDelegation);
            } else if (resolvedGouvernorat !== gouvernorat) {
              setDelegation("");
            }
          }
        }
      } catch (error) {
        if (requestId !== syncRequestRef.current) return;
        setLocationError(buildLocationErrorMessage(error));
      } finally {
        if (requestId === syncRequestRef.current) {
          setLocationStatus("idle");
        }
      }
    },
    [gouvernorat]
  );

  const centerFromSelection = useCallback(
    async (nextGouvernorat: number, nextDelegation: string) => {
      const gouvernoratLabelValue = getGouvernoratLabelById(nextGouvernorat);
      const trimmedDelegation = nextDelegation.trim();

      let targetLat: number;
      let targetLng: number;
      let targetZoom: number;

      if (gouvernoratLabelValue && trimmedDelegation) {
        try {
          setLocationStatus("selection");
          setLocationError(null);
          const result = await fetchCenterByGovDelegation(gouvernoratLabelValue, trimmedDelegation);
          targetLat = roundCoordinate(result.lat);
          targetLng = roundCoordinate(result.lng);
          targetZoom = 14;
        } catch (error) {
          const fallback = getCenterForTunisia(nextGouvernorat);
          targetLat = roundCoordinate(fallback.lat);
          targetLng = roundCoordinate(fallback.lng);
          targetZoom = fallback.zoom;
          setLocationError(buildLocationErrorMessage(error));
        }
      } else {
        const fallback = getCenterForTunisia(nextGouvernorat);
        targetLat = roundCoordinate(fallback.lat);
        targetLng = roundCoordinate(fallback.lng);
        targetZoom = fallback.zoom;
        setLocationError(null);
      }

      await synchronizeFromCoordinates(targetLat, targetLng, {
        keepSelectedRegion: true,
        status: "selection",
        zoom: targetZoom,
      });
    },
    [synchronizeFromCoordinates]
  );

  const handleGouvernoratChange = (nextValue: number) => {
    setGouvernorat(nextValue);
    setDelegation("");
    void centerFromSelection(nextValue, "");
  };

  const handleDelegationChange = (nextDelegation: string) => {
    setDelegation(nextDelegation);
    void centerFromSelection(gouvernorat, nextDelegation);
  };

  const handleMapChange = (lat: number, lng: number, reason: AddressMapChangeReason) => {
    void synchronizeFromCoordinates(lat, lng, {
      keepSelectedRegion: false,
      status: reason === "gps" ? "gps" : "reverse",
      zoom: 16,
    });
  };

  const mut = useMutation({
    mutationFn: () =>
      updateMyProfile({
        gouvernorat,
        delegation,
        telephone,
        adresse: adresse.trim(),
        adresseComplementaire: adresseComplementaire.trim() ? adresseComplementaire.trim() : null,
        codePostal: codePostal.trim() ? codePostal.trim() : null,
        pays: PAYS_FIXE,
        nomComplet: q.data?.profile?.nomComplet ?? null,
        latitude,
        longitude,
      }),
    onSuccess: async () => {
      const data = await me();
      setMe(data);
      await q.refetch();
    },
  });

  const email = q.data?.email ?? "";
  const initials = useMemo(() => initialsFromEmail(email), [email]);

  if (q.isLoading) return <Loader />;

  if (q.isError || !q.data) {

    return (
      <div className="w-full space-y-6 py-10">
        <PremiumHero kicker="Profil" title="Mon compte" gradientTitle />
        <EmptyView
          title="Profil indisponible"
          description="Erreur lors du chargement du profil. Vérifiez votre connexion ou réessayez."
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </div>
    );
  }

  // ── Profil simplifié pour Admin / Superviseur (sans onglets client) ──────────
  if (isAdmin || isSuperviseur) {
    const profile = q.data.profile;
    return (
      <div className="w-full space-y-7">
        <PremiumHero
          kicker={isAdmin ? "Administrateur" : "Superviseur"}
          title="Mon profil"
          description="Informations du compte. Les onglets Commandes et Adresses ne sont pas disponibles pour ce rôle."
        />

        <div className="rounded-3xl border border-border bg-card p-7 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-lg font-black text-primary">
              {initials}
            </div>
            <div>
              <div className="font-extrabold text-card-foreground">{email}</div>
              <div className="flex gap-2 mt-1">
                {roles.map((r) => (
                  <span key={r} className="rounded-full bg-muted/40 px-2.5 py-0.5 text-xs font-bold text-card-foreground">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Téléphone</label>
              <Input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="Ex: 22123456"
                className="h-11 rounded-2xl"
              />
            </div>
            <InfoRow label="Nom complet" value={profile?.nomComplet} />
            <InfoRow label="CIN" value={profile?.cin} />
            <InfoRow label="Poste" value={profile?.poste} />
            <InfoRow label="Département" value={profile?.departement} />
          </div>

          {mut.isError && (
            <div className="mt-4 rounded-2xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.08)] px-4 py-3 text-sm text-[hsl(var(--danger))]">
              {getApiErrorMessage(mut.error)}
            </div>
          )}
          {mut.isSuccess && (
            <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Profil mis à jour.
            </div>
          )}

          <Button
            type="button"
            className="mt-6 h-11 w-full rounded-2xl font-bold"
            isLoading={mut.isPending}
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
          >
            Enregistrer les modifications
          </Button>
        </div>
      </div>
    );
  }

  const canSave = delegation.trim().length > 0 && adresse.trim().length > 0;
  const locationBusyLabel =
    locationStatus === "gps"
      ? "Localisation GPS en cours..."
      : locationStatus === "selection"
        ? "Synchronisation carte et formulaire..."
        : locationStatus === "reverse"
          ? "Mise à jour de l’adresse et des coordonnées..."
          : null;

  return (
    <div className="w-full space-y-7">
      <div className="rounded-3xl border border-border bg-card/80 p-7 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary text-sm font-black text-white shadow-sm">
              <span className="relative z-10">{initials}</span>
              <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_60%)]" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profil</div>
              <h1 className="truncate text-2xl font-extrabold tracking-tight text-card-foreground">Mon compte</h1>
              <div className="truncate text-sm font-semibold text-muted-foreground">{email}</div>

              <div className="mt-2 flex flex-wrap gap-2">
                {(q.data.roles ?? []).map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/35 px-3 py-1 text-xs font-bold text-card-foreground/90 shadow-sm"
                  >
                    <IconShield className="h-3.5 w-3.5 text-primary" />
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sécurité</div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
              {isConfirmateur
                ? "Le profil confirmateur ne contient ni carte ni coordonnées GPS."
                : isVendeur
                  ? "Le profil vendeur masque l’adresse de livraison et la localisation exacte."
                  : "Les coordonnées GPS restent visibles mais non modifiables manuellement."}
            </div>

            {!isConfirmateur && !isVendeur && (
              <a
                href="/profile/addresses"
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 px-4 text-sm font-bold text-primary transition hover:bg-primary/10"
              >
                <IconPin className="h-4 w-4" />
                Mes adresses (carnet)
              </a>
            )}
          </div>
        </div>
      </div>

      {isVendeur ? (
        <VendeurProfilePanel
          meData={q.data}
          vendeurContext={vendeurContextQuery.data}
          vendeurContextError={vendeurContextQuery.isError ? vendeurContextQuery.error : undefined}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-3xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-6 py-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--input))] text-card-foreground shadow-sm ring-1 ring-border/60">
                    <IconUser className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informations</div>
                    <h2 className="text-lg font-extrabold text-card-foreground">Général</h2>
                  </div>
                </div>

                <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
                  Editable
                </span>
              </div>

              <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Gouvernorat</label>
                  <select
                    value={gouvernorat}
                    onChange={(event) => handleGouvernoratChange(Number(event.target.value))}
                    className="flex h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-card-foreground shadow-sm focus:border-primary/30 focus:outline-none focus:ring-4 focus:ring-primary/10"
                  >
                    {TUNISIA_GOUVERNORATS.map((item, index) => (
                      <option key={item} value={index}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Délégation</label>
                  <select
                    value={delegation}
                    onChange={(event) => handleDelegationChange(event.target.value)}
                    className="flex h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-card-foreground shadow-sm focus:border-primary/30 focus:outline-none focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">Choisir une délégation</option>
                    {(delQuery.data ?? []).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Téléphone</label>
                  <Input
                    value={telephone}
                    onChange={(event) => setTelephone(event.target.value)}
                    placeholder="Ex: 22123456"
                    className="h-11 rounded-2xl border-border bg-card shadow-sm focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>
            </div>

            {/* Module 6 (Master Prompt) — Section localisation/GPS/carte masquée pour le rôle CONFIRMATEUR. */}
            {!isConfirmateur && (
              <div className="rounded-3xl border border-border bg-card shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--input))] text-card-foreground shadow-sm ring-1 ring-border/60">
                      <IconPin className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Localisation</div>
                      <h2 className="text-lg font-extrabold text-card-foreground">Carte, GPS et adresse</h2>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/35 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    <IconSync className="h-3.5 w-3.5" />
                    {locationBusyLabel ?? "Synchronisation active entre formulaire et carte"}
                  </div>
                </div>

                <div className="space-y-6 px-6 py-6">
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4 text-sm text-card-foreground">
                    Les champs latitude et longitude sont visibles mais verrouillés. Ils se mettent à jour uniquement via <b>Utiliser ma position</b>, un clic sur la carte, ou le déplacement du pin.
                  </div>

                  {locationError ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                      {locationError}
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Latitude</label>
                      <Input
                        value={formatCoordinate(latitude)}
                        readOnly
                        placeholder="34.xxxxxx"
                        className="h-11 rounded-2xl border-border bg-muted/35 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Longitude</label>
                      <Input
                        value={formatCoordinate(longitude)}
                        readOnly
                        placeholder="10.xxxxxx"
                        className="h-11 rounded-2xl border-border bg-muted/35 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Carte synchronisée</label>
                      <span className="text-xs font-semibold text-muted-foreground">
                        Gouvernorat {safeText(getGouvernoratLabelById(gouvernorat))} {delegation ? `• ${delegation}` : ""}
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                      <AddressMapField
                        gouvernoratId={gouvernorat}
                        delegation={delegation}
                        latitude={latitude}
                        longitude={longitude}
                        viewZoom={mapZoom}
                        onChange={handleMapChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 lg:col-span-5">
            <div className="sticky top-24 rounded-3xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adresse</div>
                <h2 className="mt-1 text-lg font-extrabold text-card-foreground">Livraison</h2>
                <div className="mt-1 text-sm text-muted-foreground">
                  La carte, la géolocalisation, l’adresse et le code postal restent synchronisés dans les cas métier autorisés.
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Adresse</label>
                  <textarea
                    value={adresse}
                    onChange={(event) => setAdresse(event.target.value)}
                    rows={4}
                    placeholder="L’adresse est recalculée après localisation ou déplacement du pin."
                    className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Code postal</label>
                    <Input
                      value={codePostal}
                      onChange={(event) => setCodePostal(event.target.value)}
                      placeholder="Ex: 3000"
                      className="h-11 rounded-2xl border-border bg-card shadow-sm focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pays</label>
                    <Input value={PAYS_FIXE} readOnly className="h-11 rounded-2xl border-border bg-muted/35 shadow-sm" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Complément d’adresse</label>
                  <Input
                    value={adresseComplementaire}
                    onChange={(event) => setAdresseComplementaire(event.target.value)}
                    placeholder="App, étage, repère..."
                    className="h-11 rounded-2xl border-border bg-card shadow-sm focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <div className="rounded-2xl border border-border bg-muted/35 px-5 py-4 text-sm text-card-foreground/90">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-muted-foreground">Synchronisation actuelle</span>
                    <span className="font-extrabold text-card-foreground">
                      {locationBusyLabel ?? "Formulaire et carte alignés"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Gouvernorat et délégation recentrent la carte. GPS et pin mettent à jour automatiquement l’adresse, le code postal et la région quand c’est détectable.
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => mut.mutate()}
                  isLoading={mut.isPending}
                  disabled={mut.isPending || !canSave}
                  className="h-12 w-full rounded-2xl text-base font-extrabold shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Enregistrer les modifications
                </Button>

                <div className="text-xs text-muted-foreground">
                  Champs requis : Délégation et adresse. Les coordonnées GPS sont calculées automatiquement et restent visibles en lecture seule.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}