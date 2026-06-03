import { useState, useCallback, type SVGProps } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import type { GouvernoratItem } from "../../geo/types/geo";
import { getGouvernorats, getDelegations } from "../../geo/api/geoApi";
import { register } from "../api/authApi";
import { resolveSafeReturnTo } from "../utils/postAuthRedirect";
import { AddressMapModal } from "../components/AddressMapModal";
import { reverseGeocodeNominatim } from "../../geo/api/nominatimApi";
import {
  resolveGouvernoratIdFromReverse,
  resolveDelegationFromReverse,
} from "../../geo/utils/tunisiaLocationSync";
import { AuthSplitShell, BrandMark } from "../components/AuthSplitShell";
import { Input } from "../../../shared/components/Input";
import { Button } from "../../../shared/components/Button";
import { PasswordInput } from "../../../shared/components/PasswordInput";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";

function IconTarget(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function IconMap(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
      <line x1="9" y1="4" x2="9" y2="17" />
      <line x1="15" y1="7" x2="15" y2="20" />
    </svg>
  );
}

const selectCls =
  "h-11 w-full rounded-2xl border border-border bg-input px-3 text-sm text-card-foreground outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:opacity-50 disabled:cursor-not-allowed";

export function RegisterPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = resolveSafeReturnTo(searchParams.get("returnTo"));

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gouvernorat, setGouvernorat] = useState<number | null>(null);
  const [delegation, setDelegation] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [mapOpen, setMapOpen] = useState(false);
  const [mapSyncMsg, setMapSyncMsg] = useState("");
  const [mapLocating, setMapLocating] = useState(false);
  const [pwError, setPwError] = useState("");

  const govQuery = useQuery<GouvernoratItem[]>({
    queryKey: ["gouvernorats"],
    queryFn: getGouvernorats,
  });

  const delegQuery = useQuery<string[]>({
    queryKey: ["delegations", gouvernorat],
    queryFn: () => getDelegations(gouvernorat!),
    enabled: gouvernorat !== null,
  });

  const mutation = useMutation({
    mutationFn: () =>
      register({
        email,
        password,
        typeProfil: 1,
        gouvernorat: gouvernorat!,
        delegation: delegation!,
        adresse: address,
        codePostal: postalCode || null,
        nomComplet: `${firstName} ${lastName}`.trim(),
        telephone: phone || null,
        latitude,
        longitude,
      }),
    onSuccess: () => {
      const dest = returnTo
        ? `/login?returnTo=${encodeURIComponent(returnTo)}&registered=1`
        : "/login?registered=1";
      nav(dest, { replace: true });
    },
  });

  const handleMapPick = useCallback(
    async (lat: number, lng: number) => {
      setLatitude(Number(lat.toFixed(6)));
      setLongitude(Number(lng.toFixed(6)));
      setMapSyncMsg("Analyse de la position…");
      try {
        const result = await reverseGeocodeNominatim(lat, lng);
        const govId = resolveGouvernoratIdFromReverse(result);
        if (govId !== null) setGouvernorat(govId);
        const delegList = govId !== null ? await getDelegations(govId).catch(() => []) : [];
        const resolvedDeleg = resolveDelegationFromReverse(result, delegList);
        if (resolvedDeleg) setDelegation(resolvedDeleg);
        const govName =
          govId !== null
            ? (govQuery.data ?? []).find((g) => g.id === govId)?.name ?? ""
            : "";
        setMapSyncMsg(
          `Position épinglée · ${govName}${resolvedDeleg ? ` · ${resolvedDeleg}` : ""}`
        );
      } catch {
        setMapSyncMsg("Position enregistrée. Vérifiez le gouvernorat et la délégation.");
      }
    },
    [govQuery.data]
  );

  const getMyPosition = useCallback(async () => {
    setMapLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      await handleMapPick(position.coords.latitude, position.coords.longitude);
    } catch {
      setMapSyncMsg("Impossible d'accéder à votre position GPS.");
    } finally {
      setMapLocating(false);
    }
  }, [handleMapPick]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPwError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (gouvernorat === null) {
      setPwError("Veuillez sélectionner un gouvernorat.");
      return;
    }
    if (!delegation) {
      setPwError("Veuillez sélectionner une délégation.");
      return;
    }
    setPwError("");
    mutation.mutate();
  };

  return (
    <>
      <AuthSplitShell screen="register" formClassName="!items-start overflow-y-auto">
        <div className="w-full max-w-[500px] py-2">
          <div className="text-center">
            <BrandMark />
            <div className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-muted-foreground">
              Inscription
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-card-foreground">
              Créer un compte
            </h1>
            <p className="mx-auto mt-3 max-w-[360px] text-sm leading-6 text-muted-foreground">
              Remplissez le formulaire pour accéder au catalogue et gérer vos commandes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {/* Identité */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-card-foreground">Prénom</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-card-foreground">Nom</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                  className="h-11"
                  required
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-card-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemple.tn"
                  autoComplete="email"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-card-foreground">Téléphone</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+216 20 000 000"
                  className="h-11"
                />
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-2">
              <label className="text-sm font-extrabold text-card-foreground">Adresse</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Rue de la Paix"
                className="h-11"
              />
            </div>

            {/* Gouvernorat & Délégation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-card-foreground">Gouvernorat</label>
                <select
                  value={gouvernorat ?? ""}
                  onChange={(e) => {
                    setGouvernorat(e.target.value ? Number(e.target.value) : null);
                    setDelegation(null);
                  }}
                  className={selectCls}
                  required
                >
                  <option value="">Sélectionner...</option>
                  {(govQuery.data ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-card-foreground">Délégation</label>
                <select
                  value={delegation ?? ""}
                  onChange={(e) => setDelegation(e.target.value || null)}
                  className={selectCls}
                  disabled={gouvernorat === null}
                  required
                >
                  <option value="">Sélectionner...</option>
                  {(delegQuery.data ?? []).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Code Postal + GPS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-card-foreground">Code postal</label>
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="1000"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-card-foreground">Géolocalisation</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 gap-1.5 text-xs font-bold"
                    onClick={getMyPosition}
                    isLoading={mapLocating}
                    disabled={mapLocating}
                  >
                    <IconTarget className="h-3.5 w-3.5" />
                    {latitude !== null ? "GPS ✓" : "GPS"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 gap-1.5 text-xs font-bold"
                    onClick={() => setMapOpen(true)}
                  >
                    <IconMap className="h-3.5 w-3.5" />
                    Carte
                  </Button>
                </div>
              </div>
            </div>

            {/* GPS status badge */}
            {(latitude !== null || mapSyncMsg) ? (
              <div className="flex flex-wrap items-center gap-2">
                {latitude !== null && longitude !== null ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    <button
                      type="button"
                      onClick={() => {
                        setLatitude(null);
                        setLongitude(null);
                        setMapSyncMsg("");
                      }}
                      className="ml-1 text-success/60 transition-colors hover:text-danger"
                    >
                      ✕
                    </button>
                  </span>
                ) : null}
                {mapSyncMsg ? (
                  <span className="text-[11px] font-medium text-muted-foreground">{mapSyncMsg}</span>
                ) : null}
              </div>
            ) : null}

            {/* Mots de passe */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-card-foreground">Mot de passe</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-extrabold text-card-foreground">Confirmer</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="h-11"
                  required
                />
              </div>
            </div>

            {pwError ? (
              <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
                {pwError}
              </div>
            ) : null}

            {mutation.isError ? (
              <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
                {getApiErrorMessage(mutation.error)}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="h-[52px] w-full rounded-2xl text-base font-black"
              isLoading={mutation.isPending}
              disabled={mutation.isPending}
            >
              S'inscrire
            </Button>

            <div className="pt-1 text-center text-sm font-medium text-muted-foreground">
              Déjà un compte ?{" "}
              <Link to="/login" className="font-black text-primary hover:underline">
                Se connecter
              </Link>
            </div>
          </form>
        </div>
      </AuthSplitShell>

      <AddressMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        gouvernorat={gouvernorat}
        delegation={delegation}
        latitude={latitude}
        longitude={longitude}
        onChange={(lat, lng) => {
          void handleMapPick(lat, lng);
          setMapOpen(false);
        }}
      />
    </>
  );
}

export default RegisterPage;
