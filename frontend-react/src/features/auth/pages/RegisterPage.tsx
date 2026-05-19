import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { register } from "../api/authApi";
import { useAuthStore } from "../store/authStore";
import { resolvePostAuthRedirect, resolveSafeReturnTo } from "../utils/postAuthRedirect";
import type { RegisterRequestDto } from "../types/auth";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { PasswordInput } from "../../../shared/components/PasswordInput";

import { getGouvernorats, getDelegations } from "../../geo/api/geoApi";
import { AddressInputFromLatLng } from "../../geo/components/AddressInputFromLatLng";

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

  useEffect(() => {
    if (!bootstrapped) return;
    if (isAuth) nav(resolvePostAuthRedirect(roles, returnTo), { replace: true });
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
    if (!delegation && list.length > 0) setDelegation(list[0]);
    if (list.length === 0) setDelegation("");
  }, [delQuery.data, delegation]);

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
  }, [email, password, telephone, delegation, adresse, typeClient, nomSociete, matriculeFiscal]);

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
        adresseComplementaire: adresseComplementaire.trim() ? adresseComplementaire.trim() : null,
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

  const selectClass =
    "h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

  function getMyPosition() {
    if (!navigator.geolocation) {
      alert("Geolocation non supportée par ce navigateur.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
      },
      (err) => {
        alert(`Impossible de récupérer la position: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="w-full max-w-3xl py-10">
      <div className="app-surface anim-fade-up overflow-hidden text-card-foreground shadow-[0_42px_120px_-60px_rgba(15,23,42,0.95)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-indigo-500 to-fuchsia-500" />

        <div className="space-y-6 px-8 py-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-xl font-black text-white shadow-[0_18px_38px_-24px_hsl(var(--primary)/0.8)]">
              O
            </div>
            <div className="app-kicker">Création de compte</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-card-foreground">Créer un compte</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {returnTo === "/checkout"
                ? "Créez votre compte puis reprenez immédiatement la validation de commande."
                : "Choisissez votre type de client puis complétez vos informations."}
            </p>
          </div>

          {returnTo === "/checkout" ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-card-foreground">
              Votre panier sera conservé. Après création du compte, vous serez redirigé vers le checkout.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant={typeClient === 0 ? "primary" : "outline"} onClick={() => setTypeClient(0)} className="rounded-2xl">
              Client (B2C)
            </Button>
            <Button type="button" variant={typeClient === 1 ? "primary" : "outline"} onClick={() => setTypeClient(1)} className="rounded-2xl">
              Entreprise (B2B)
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-card-foreground">Nom complet</label>
              <Input value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} placeholder="Votre nom" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Téléphone</label>
              <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Ex: 22123456" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.tn" />
            </div>

            {typeClient === 1 ? (
              <>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-card-foreground">Nom société</label>
                  <Input value={nomSociete} onChange={(e) => setNomSociete(e.target.value)} placeholder="Nom de l'entreprise" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-card-foreground">Matricule fiscal</label>
                  <Input value={matriculeFiscal} onChange={(e) => setMatriculeFiscal(e.target.value)} placeholder="MF-123..." />
                </div>
              </>
            ) : null}

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-card-foreground">Mot de passe</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="new-password" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Gouvernorat</label>
              <div className="relative">
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
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Délégation</label>
              <div className="relative">
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
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Latitude</label>
              <Input value={latitude ?? ""} onChange={(e) => setLatitude(e.target.value === "" ? null : Number(e.target.value))} placeholder="34.xxxxxx" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Longitude</label>
              <Input value={longitude ?? ""} onChange={(e) => setLongitude(e.target.value === "" ? null : Number(e.target.value))} placeholder="10.xxxxxx" />
            </div>

            <div className="md:col-span-2">
              <Button type="button" variant="outline" className="w-full" onClick={getMyPosition}>
                Utiliser ma position (GPS)
              </Button>
            </div>
          </div>

          <AddressInputFromLatLng
            latitude={latitude}
            longitude={longitude}
            value={adresse}
            onChange={setAdresse}
            codePostalValue={codePostal}
            onCodePostalChange={setCodePostal}
          />

          <div className="space-y-2">
            <label className="text-sm font-semibold text-card-foreground">Complément d’adresse</label>
            <Input value={adresseComplementaire} onChange={(e) => setAdresseComplementaire(e.target.value)} placeholder="App, étage, repère..." />
          </div>

          {mutation.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              Erreur : vérifiez email unique + gouvernorat/délégation + champs requis (adresse).
            </div>
          ) : null}

          <Button
            type="button"
            variant="primary"
            className="h-12 w-full rounded-2xl text-base font-bold"
            onClick={() => mutation.mutate()}
            isLoading={mutation.isPending}
            disabled={mutation.isPending || !canSubmit}
          >
            Créer mon compte
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link className="font-semibold text-primary hover:underline" to={loginHref}>
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}