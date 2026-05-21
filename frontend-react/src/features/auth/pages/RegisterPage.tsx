import { useEffect, useMemo, useState, type ReactNode, type SVGProps } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { register } from "../api/authApi";
import { useAuthStore } from "../store/authStore";
import { resolvePostAuthRedirect, resolveSafeReturnTo } from "../utils/postAuthRedirect";
import type { RegisterRequestDto } from "../types/auth";
import { AuthSplitShell, BrandMark } from "../components/AuthSplitShell";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { PasswordInput } from "../../../shared/components/PasswordInput";

import { getGouvernorats, getDelegations } from "../../geo/api/geoApi";
import { useReverseGeocode } from "../../geo/hooks/useReverseGeocode";
import { formatShortAddress } from "../../geo/utils/addressFormat";
import * as olc from "open-location-code";

function IconPin(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s7-4.5 7-12a7 7 0 0 0-14 0c0 7.5 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function buildAddressValue(plusCode: string, shortAddress: string) {
  const pc = plusCode.trim();
  const addr = shortAddress.trim();

  if (pc && addr) return `${pc}, ${addr}`;
  if (pc) return pc;
  if (addr) return addr;
  return "";
}

function encodePlusCode(lat: number | null, lon: number | null) {
  if (typeof lat !== "number" || typeof lon !== "number") return "";

  try {
    const encodeFn =
      typeof (olc as any).encode === "function"
        ? (olc as any).encode
        : (olc as any).OpenLocationCode?.encode;

    if (typeof encodeFn !== "function") return "";
    return String(encodeFn(lat, lon));
  } catch {
    return "";
  }
}

const inputClass =
  "h-10 rounded-xl border-slate-200 bg-white text-[13px] shadow-none dark:border-white/10 dark:bg-slate-900/70";

const selectClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100";

function FormLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-[13px] font-extrabold text-slate-900 dark:text-white">
      {children}
    </label>
  );
}

export function RegisterPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const roles = useAuthStore((s) => s.roles);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  const [typeClient, setTypeClient] = useState<number>(0);
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [nomSociete, setNomSociete] = useState("");
  const [matriculeFiscal, setMatriculeFiscal] = useState("");

  const [gouvernorat, setGouvernorat] = useState<number>(22);
  const [delegation, setDelegation] = useState<string>("");

  const [adresse, setAdresse] = useState("");
  const [adresseComplementaire, setAdresseComplementaire] = useState("");
  const [codePostal, setCodePostal] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const PAYS_FIXE = "Tunisie";

  const returnTo = resolveSafeReturnTo(searchParams.get("returnTo"));

  const loginHref = useMemo(
    () => (returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"),
    [returnTo]
  );

  const safeLatitude =
    typeof latitude === "number" && Number.isFinite(latitude) ? latitude : null;

  const safeLongitude =
    typeof longitude === "number" && Number.isFinite(longitude) ? longitude : null;

  const {
    data: reverseAddress,
    isLoading: reverseLoading,
    isError: reverseError,
  } = useReverseGeocode(safeLatitude, safeLongitude);

  const plusCode = useMemo(
    () => encodePlusCode(safeLatitude, safeLongitude),
    [safeLatitude, safeLongitude]
  );

  const shortAddress = useMemo(
    () => formatShortAddress(reverseAddress),
    [reverseAddress]
  );

  const autoAdresse = useMemo(
    () => buildAddressValue(plusCode, reverseError ? "" : shortAddress),
    [plusCode, reverseError, shortAddress]
  );

  const autoCodePostal = useMemo(
    () => String(reverseAddress?.address?.postcode ?? "").trim(),
    [reverseAddress?.address?.postcode]
  );

  useEffect(() => {
    if (!bootstrapped) return;

    if (isAuth) {
      nav(resolvePostAuthRedirect(roles, returnTo), { replace: true });
    }
  }, [bootstrapped, isAuth, roles, nav, returnTo]);

  const govQuery = useQuery({
    queryKey: ["geo-gouvernorats"],
    queryFn: getGouvernorats,
  });

  const delQuery = useQuery({
    queryKey: ["geo-delegations", gouvernorat],
    queryFn: () => getDelegations(gouvernorat),
    enabled: Number.isFinite(gouvernorat),
  });

  useEffect(() => {
    const list = delQuery.data ?? [];

    if (!delegation && list.length > 0) {
      setDelegation(list[0]);
    }

    if (list.length === 0) {
      setDelegation("");
    }
  }, [delQuery.data, delegation]);

  useEffect(() => {
    if (!adresse.trim() && autoAdresse.trim()) {
      setAdresse(autoAdresse);
    }
  }, [adresse, autoAdresse]);

  useEffect(() => {
    if (!codePostal.trim() && autoCodePostal.trim()) {
      setCodePostal(autoCodePostal);
    }
  }, [codePostal, autoCodePostal]);

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (!password.trim()) return false;
    if (!telephone.trim()) return false;
    if (!delegation.trim()) return false;
    if (!adresse.trim()) return false;

    if (typeClient === 1) {
      if (!nomSociete.trim()) return false;
      if (!matriculeFiscal.trim()) return false;
    }

    return true;
  }, [
    email,
    password,
    telephone,
    delegation,
    adresse,
    typeClient,
    nomSociete,
    matriculeFiscal,
  ]);

  const mutation = useMutation({
    mutationFn: () => {
      const dto: RegisterRequestDto = {
        email: email.trim(),
        password,
        typeProfil: 0,
        typeClient,
        gouvernorat,
        delegation,
        adresse: adresse.trim(),
        adresseComplementaire: adresseComplementaire.trim()
          ? adresseComplementaire.trim()
          : null,
        codePostal: codePostal.trim() ? codePostal.trim() : null,
        pays: PAYS_FIXE,
        nomComplet: nomComplet || null,
        telephone: telephone || null,
        latitude,
        longitude,
        nomSociete: typeClient === 1 ? nomSociete : null,
        matriculeFiscal: typeClient === 1 ? matriculeFiscal : null,
      };

      return register(dto);
    },
    onSuccess: (res) => {
      setAuth({
        token: res.accessToken,
        expiresInMinutes: res.expiresInMinutes,
        userId: res.userId,
        email: res.email,
        roles: res.roles,
      });

      nav(resolvePostAuthRedirect(res.roles ?? [], returnTo), { replace: true });
    },
  });

  function getMyPosition() {
    if (!navigator.geolocation) {
      alert("Géolocalisation non supportée par ce navigateur.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
      },
      (err) => {
        alert(`Impossible de récupérer la position : ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  function recalculateAddress() {
    if (autoAdresse.trim()) setAdresse(autoAdresse);
    if (autoCodePostal.trim()) setCodePostal(autoCodePostal);
  }

  return (
    <AuthSplitShell screen="register" formClassName="lg:px-12">
      <div className="w-full max-w-[560px]">
        <div className="text-center">
          <BrandMark />

          <div className="mt-5 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Création de compte
          </div>

          <h1 className="mt-1.5 text-3xl font-black tracking-[-0.045em] text-slate-950 dark:text-white">
            Créer un compte
          </h1>

          <p className="mx-auto mt-2 max-w-[420px] text-sm leading-6 text-slate-600 dark:text-slate-300">
            {returnTo === "/checkout"
              ? "Créez votre compte puis reprenez immédiatement la validation de commande."
              : "Choisissez votre type de client puis complétez vos informations."}
          </p>
        </div>

        {returnTo === "/checkout" ? (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
            Votre panier sera conservé. Après création du compte, vous serez redirigé vers le checkout.
          </div>
        ) : null}

        <div className="auth-segment mt-5">
          <button
            type="button"
            onClick={() => setTypeClient(0)}
            className={[
              "auth-segment-option",
              typeClient === 0
                ? "auth-segment-option-active"
                : "auth-segment-option-inactive",
            ].join(" ")}
          >
            Client
          </button>

          <button
            type="button"
            onClick={() => setTypeClient(1)}
            className={[
              "auth-segment-option",
              typeClient === 1
                ? "auth-segment-option-active"
                : "auth-segment-option-inactive",
            ].join(" ")}
          >
            Entreprise
          </button>
        </div>

        <div className="mt-5 grid gap-3.5 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <FormLabel>Nom complet</FormLabel>
            <Input
              value={nomComplet}
              onChange={(e) => setNomComplet(e.target.value)}
              placeholder="Votre nom"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <FormLabel>Téléphone</FormLabel>
            <Input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Ex: 22 123 456"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.tn"
              className={inputClass}
            />
          </div>

          {typeClient === 1 ? (
            <>
              <div className="space-y-1.5">
                <FormLabel>Nom société</FormLabel>
                <Input
                  value={nomSociete}
                  onChange={(e) => setNomSociete(e.target.value)}
                  placeholder="Nom de l'entreprise"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <FormLabel>Matricule fiscal</FormLabel>
                <Input
                  value={matriculeFiscal}
                  onChange={(e) => setMatriculeFiscal(e.target.value)}
                  placeholder="MF-123..."
                  className={inputClass}
                />
              </div>
            </>
          ) : null}

          <div className="space-y-1.5 md:col-span-2">
            <FormLabel>Mot de passe</FormLabel>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <FormLabel>Gouvernorat</FormLabel>
            <select
              className={selectClass}
              value={gouvernorat}
              onChange={(e) => setGouvernorat(Number(e.target.value))}
              disabled={govQuery.isLoading || govQuery.isError}
            >
              {(govQuery.data ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <FormLabel>Délégation</FormLabel>
            <select
              className={selectClass}
              value={delegation}
              onChange={(e) => setDelegation(e.target.value)}
              disabled={delQuery.isLoading || (delQuery.data?.length ?? 0) === 0}
            >
              {(delQuery.data ?? []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="button"
              className="auth-gps-button inline-flex items-center justify-center gap-2"
              onClick={getMyPosition}
            >
              <IconPin className="h-4 w-4" />

              {safeLatitude !== null && safeLongitude !== null
                ? "Position GPS détectée"
                : "Utiliser ma position (GPS)"}
            </button>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <FormLabel>Adresse (obligatoire)</FormLabel>

              <button
                type="button"
                onClick={recalculateAddress}
                disabled={safeLatitude === null || safeLongitude === null || reverseLoading}
                className="auth-recalculate-button"
              >
                Recalculer
              </button>
            </div>

            <textarea
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="Ex: QPQ2+G88, 3093 Rte Lafrane, Sfax"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-800 shadow-none outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
            />

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {safeLatitude === null || safeLongitude === null
                ? "Cliquez sur le bouton GPS pour remplir automatiquement l’adresse."
                : reverseLoading
                  ? "Recherche de l’adresse…"
                  : reverseError
                    ? "Adresse indisponible. Le Plus Code sera utilisé si possible."
                    : "Position détectée. L’adresse peut être modifiée manuellement."}
            </p>
          </div>

          <div className="space-y-1.5">
            <FormLabel>Code postal</FormLabel>
            <Input
              value={codePostal}
              onChange={(e) => setCodePostal(e.target.value)}
              placeholder="Ex: 3000"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <FormLabel>Complément d’adresse</FormLabel>
            <Input
              value={adresseComplementaire}
              onChange={(e) => setAdresseComplementaire(e.target.value)}
              placeholder="App, étage, repère..."
              className={inputClass}
            />
          </div>
        </div>

        {mutation.isError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
            Erreur : vérifiez email unique + gouvernorat/délégation + champs requis.
          </div>
        ) : null}

        <Button
          type="button"
          variant="primary"
          className="mt-4 h-[46px] w-full rounded-xl bg-[linear-gradient(135deg,#0f63ff,#4f46e5)] text-base font-black shadow-[0_22px_52px_-28px_rgba(37,99,235,0.95)]"
          onClick={() => mutation.mutate()}
          isLoading={mutation.isPending}
          disabled={mutation.isPending || !canSubmit}
        >
          Créer mon compte
        </Button>

        <div className="mt-3 text-center text-sm font-medium text-slate-500 dark:text-slate-300">
          Déjà un compte ?{" "}
          <Link
            className="font-black text-blue-600 hover:underline dark:text-blue-300"
            to={loginHref}
          >
            Se connecter
          </Link>
        </div>
      </div>
    </AuthSplitShell>
  );
}