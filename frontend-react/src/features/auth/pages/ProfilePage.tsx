import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { EmptyView, PremiumHero } from "../../../shared/components/premium";

function IconMenu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s7-4.5 7-12a7 7 0 0 0-14 0c0 7.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </svg>
  );
}

function IconStore(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 10.5 5 4h14l2 6.5" />
      <path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M9 20v-6h6v6" />
      <path d="M3 10.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 3-2.5" />
    </svg>
  );
}

function IconSync(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 11a8 8 0 0 0-14.9-4M4 13a8 8 0 0 0 14.9 4" />
      <path d="M4 4v4h4M20 20v-4h-4" />
    </svg>
  );
}

function IconTruck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}

function IconHeart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  );
}

function IconSettings(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

function IconLogout(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function IconEdit(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconInfo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function IconLock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
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

function displayNameFromProfile(meData: MeResponseDto) {
  const profileName = meData.profile?.nomComplet?.trim();
  if (profileName) return profileName;
  const email = meData.email ?? "";
  const local = email.split("@")[0]?.trim();
  return local || "Client";
}

function formatCoordinate(value: number | null) {
  return typeof value === "number" ? value.toFixed(6) : "";
}

function buildLocationErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Impossible de synchroniser la localisation.";
}

const cardClass =
  "rounded-[24px] border border-border bg-card text-card-foreground shadow-[0_22px_64px_-52px_rgba(15,23,42,0.5)]";
const inputClass =
  "h-11 rounded-2xl border-border bg-input text-card-foreground shadow-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10";
const labelClass = "mb-2 block text-xs font-bold uppercase text-muted-foreground";

function SectionTitle({
  icon,
  title,
  eyebrow,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
          {icon}
        </span>
        <div>
          {eyebrow ? <div className="text-xs font-semibold uppercase text-muted-foreground">{eyebrow}</div> : null}
          <h2 className="text-lg font-extrabold text-card-foreground">{title}</h2>
        </div>
      </div>
      {action}
    </header>
  );
}

function InfoTile({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-extrabold text-card-foreground">{safeText(value)}</div>
    </div>
  );
}

function LockedCoordinateField({ label, value, placeholder }: { label: string; value: string; placeholder: string }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <Input value={value} readOnly placeholder={placeholder} className={`${inputClass} pr-11 text-muted-foreground`} />
        <IconLock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

function AccountSidebar({ onLogout }: { onLogout: () => void }) {
  const items = [
    { label: "Mon compte", icon: <IconUser className="h-4 w-4" />, href: "/profile", active: true },
    { label: "Mes commandes", icon: <IconTruck className="h-4 w-4" />, href: "/orders" },
    { label: "Mes favoris", icon: <IconHeart className="h-4 w-4" />, href: "/favorites" },
    { label: "Mes adresses", icon: <IconPin className="h-4 w-4" />, href: "/profile/addresses" },
    { label: "Paramètres", icon: <IconSettings className="h-4 w-4" />, href: "/profile" },
  ];

  return (
    <aside className="lg:sticky lg:top-28">
      <div className="rounded-[24px] border border-border bg-card p-3 shadow-[0_22px_64px_-54px_rgba(15,23,42,0.55)]">
        <div className="mb-3 flex items-center gap-3 px-3 py-3 lg:hidden">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <IconMenu className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-extrabold text-card-foreground">Navigation</div>
            <div className="text-xs text-muted-foreground">Compte client</div>
          </div>
        </div>

        <nav className="grid gap-1">
          {items.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={[
                "relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition",
                item.active
                  ? "bg-primary/8 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-card-foreground",
              ].join(" ")}
            >
              {item.active ? <span className="absolute left-0 top-3 h-6 w-1 rounded-r-full bg-primary" /> : null}
              <span className={item.active ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-danger transition hover:bg-danger/10"
          >
            <IconLogout className="h-4 w-4" />
            Déconnexion
          </button>
        </nav>
      </div>
    </aside>
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
      <div className={`${cardClass} lg:col-span-7`}>
        <SectionTitle icon={<IconUser className="h-5 w-5" />} eyebrow="Informations" title="Identité vendeur" />
        <div className="grid gap-4 p-6 md:grid-cols-2">
          <InfoTile label="Email" value={meData.email} />
          <InfoTile label="Nom complet" value={profile?.nomComplet} />
          <InfoTile label="Téléphone" value={profile?.telephone} />
          <InfoTile label="CIN" value={profile?.cin} />
          <InfoTile label="Code employé" value={profile?.codeEmploye} />
          <InfoTile label="Poste" value={profile?.poste} />
          <InfoTile label="Département" value={profile?.departement} />
          <InfoTile label="Gouvernorat" value={gouvernoratLabel(profile?.gouvernorat)} />
          <div className="md:col-span-2">
            <InfoTile label="Délégation" value={profile?.delegation} />
          </div>
        </div>
      </div>

      <div className={`${cardClass} lg:col-span-5`}>
        <SectionTitle icon={<IconStore className="h-5 w-5" />} eyebrow="Affectation" title="Dépôt vendeur" />
        <div className="space-y-4 p-6">
          {vendeurContextError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
              {getApiErrorMessage(vendeurContextError)}
            </div>
          ) : null}
          <InfoTile label="Code dépôt profil" value={profile?.codeDepot} />
          <InfoTile label="Intitulé dépôt" value={depot?.depotIntitule || profile?.codeDepot} />
          <InfoTile label="Code dépôt" value={depot?.depotCode} />
          <InfoTile label="Ville dépôt" value={depot?.city} />
          <InfoTile label="Code postal dépôt" value={depot?.postalCode} />
          <InfoTile label="Adresse dépôt" value={depot?.address} />
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
            Les adresses de livraison client et la localisation GPS précise sont masquées pour le rôle vendeur.
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-card-foreground">{value ?? "—"}</div>
    </div>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const setMe = useAuthStore((s) => s.setMe);
  const clear = useAuthStore((s) => s.clear);

  const q = useQuery({
    queryKey: ["me"],
    queryFn: () => me(),
  });

  const roles = q.data?.roles ?? [];
  const isVendeur = roles.includes("VENDEUR");
  const isConfirmateur = roles.includes("CONFIRMATEUR") || roles.includes("CONFIRMATRICE");
  const isAdmin = roles.includes("ADMIN");
  const isSuperviseur = roles.includes("SUPERVISEUR");

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
      },
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
    [gouvernorat],
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
    [synchronizeFromCoordinates],
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
            <div className="mt-4 rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">
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

  const displayName = displayNameFromProfile(q.data);
  const primaryRole = q.data.roles?.[0] ?? "CLIENT";
  const canSave = delegation.trim().length > 0 && adresse.trim().length > 0;
  const locationBusyLabel =
    locationStatus === "gps"
      ? "Localisation GPS en cours..."
      : locationStatus === "selection"
        ? "Synchronisation carte et formulaire..."
        : locationStatus === "reverse"
          ? "Mise à jour de l'adresse et des coordonnées..."
          : null;

  const logout = () => {
    clear();
    navigate("/login", { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] pb-10">
      <div className="grid items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        <AccountSidebar onLogout={logout} />

        <main className="min-w-0 space-y-6">
          <h1 className="text-3xl font-extrabold text-card-foreground md:text-4xl">Mon compte</h1>

          <section className={`${cardClass} overflow-hidden`}>
            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
              <div className="flex min-w-0 items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-600 text-xl font-black text-white shadow-[0_18px_38px_-24px_hsl(var(--primary)/0.8)]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-extrabold text-card-foreground">{displayName}</h2>
                  <div className="mt-1 truncate text-sm font-semibold text-muted-foreground">{email}</div>
                  <div className="mt-3">
                    <span className="inline-flex items-center rounded-full badge-info px-3 py-1 text-xs font-extrabold">
                      {primaryRole}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-border bg-muted/30 p-5">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                    <IconShield className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-card-foreground">Sécurité</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {isConfirmateur
                        ? "Le profil confirmateur ne contient ni carte ni coordonnées GPS."
                        : isVendeur
                          ? "Le profil vendeur masque l'adresse de livraison et la localisation exacte."
                          : "Les coordonnées GPS restent visibles mais non modifiables manuellement."}
                    </p>
                    {!isConfirmateur && !isVendeur ? (
                      <Link
                        to="/profile/addresses"
                        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/8 px-4 text-sm font-extrabold text-primary transition hover:bg-primary/15"
                      >
                        <IconPin className="h-4 w-4" />
                        Mes adresses (carnet)
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {isVendeur ? (
            <VendeurProfilePanel
              meData={q.data}
              vendeurContext={vendeurContextQuery.data}
              vendeurContextError={vendeurContextQuery.isError ? vendeurContextQuery.error : undefined}
            />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] xl:items-start">
              <div className="space-y-6">
                <section className={cardClass}>
                  <SectionTitle
                    icon={<IconUser className="h-5 w-5" />}
                    title="Informations générales"
                    action={
                      <span className="inline-flex h-9 items-center gap-2 rounded-2xl border border-border bg-card px-3 text-xs font-extrabold text-card-foreground">
                        <IconEdit className="h-3.5 w-3.5" />
                        Modifier
                      </span>
                    }
                  />
                  <div className="grid gap-4 p-6 md:grid-cols-3">
                    <div>
                      <label className={labelClass}>Gouvernorat</label>
                      <select
                        value={gouvernorat}
                        onChange={(event) => handleGouvernoratChange(Number(event.target.value))}
                        className={`${inputClass} w-full px-4`}
                      >
                        {TUNISIA_GOUVERNORATS.map((item, index) => (
                          <option key={item} value={index}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Délégation</label>
                      <select
                        value={delegation}
                        onChange={(event) => handleDelegationChange(event.target.value)}
                        className={`${inputClass} w-full px-4`}
                      >
                        <option value="">Choisir une délégation</option>
                        {(delQuery.data ?? []).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Téléphone</label>
                      <Input
                        value={telephone}
                        onChange={(event) => setTelephone(event.target.value)}
                        placeholder="Ex: 22123456"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </section>

                {!isConfirmateur && (
                  <section className={cardClass}>
                    <SectionTitle
                      icon={<IconPin className="h-5 w-5" />}
                      title="Localisation (Carte, GPS et adresse)"
                      action={
                          <span className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-extrabold text-success">
                          <IconSync className="h-3.5 w-3.5" />
                          {locationBusyLabel ?? "Synchronisation active"}
                        </span>
                      }
                    />

                    <div className="space-y-5 p-6">
                      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                        <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
                        <p>
                          Les champs latitude et longitude sont visibles mais verrouillés. Ils se mettent à jour uniquement via l'utilisation de ma position.
                        </p>
                      </div>

                      {locationError ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                          {locationError}
                        </div>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-2">
                        <LockedCoordinateField label="Latitude" value={formatCoordinate(latitude)} placeholder="34.xxxxxx" />
                        <LockedCoordinateField label="Longitude" value={formatCoordinate(longitude)} placeholder="10.xxxxxx" />
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-xs font-extrabold uppercase text-muted-foreground">Carte synchronisée</label>
                          <span className="text-xs font-bold text-muted-foreground">
                            Gouvernorat : {safeText(getGouvernoratLabelById(gouvernorat))} {delegation ? `• Délégation : ${delegation}` : ""}
                          </span>
                        </div>

                        <div className="overflow-hidden rounded-[24px] border border-border bg-card p-2 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.6)]">
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
                  </section>
                )}
              </div>

              <section className={`${cardClass} xl:sticky xl:top-28`}>
                <header className="border-b border-border px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
                      <IconTruck className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-extrabold text-card-foreground">Adresse de livraison</h2>
                      <div className="mt-2 h-1 w-16 rounded-full bg-primary" />
                    </div>
                  </div>
                </header>

                <div className="space-y-5 p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Code postal</label>
                      <Input
                        value={codePostal}
                        onChange={(event) => setCodePostal(event.target.value)}
                        placeholder="Ex: 3000"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Pays</label>
                      <div className="relative">
                        <Input value={`🇹🇳  ${PAYS_FIXE}`} readOnly className={`${inputClass} cursor-default text-card-foreground`} />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">⌄</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Adresse</label>
                    <textarea
                      value={adresse}
                      onChange={(event) => setAdresse(event.target.value)}
                      rows={4}
                      placeholder="Route de Gremda, Markaz Kammoun"
                      className="w-full rounded-2xl border border-border/80 bg-input px-4 py-3 text-sm text-card-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Complément d'adresse (optionnel)</label>
                    <Input
                      value={adresseComplementaire}
                      onChange={(event) => setAdresseComplementaire(event.target.value)}
                      placeholder="App, étage, repère..."
                      className={inputClass}
                    />
                  </div>

                  <div className="rounded-[22px] border border-primary/20 bg-primary/[0.06] p-5">
                    <div className="text-sm font-extrabold text-card-foreground">Synchronisation</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Gouvernorat et délégation recentrent la carte. GPS et pin mettent à jour automatiquement l'adresse, le code postal et la région quand c'est détectable.
                    </p>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => mut.mutate()}
                      isLoading={mut.isPending}
                      disabled={mut.isPending || !canSave}
                      className="mt-5 h-12 w-full rounded-2xl text-base font-extrabold"
                    >
                      Enregistrer les modifications
                    </Button>
                  </div>

                  <div className="text-xs leading-5 text-muted-foreground">
                    Champs requis : Délégation et adresse. Les coordonnées GPS sont calculées automatiquement et restent visibles en lecture seule.
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
