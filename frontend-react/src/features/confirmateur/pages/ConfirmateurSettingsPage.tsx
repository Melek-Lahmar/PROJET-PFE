import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { me, updateMyProfile } from "../../auth/api/authApi";
import { useAuthStore } from "../../auth/store/authStore";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { useToast } from "../../../shared/components/premium/Toast";
import { PremiumHero } from "../../../shared/components/premium";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";

const cardClass =
  "rounded-[24px] border border-border bg-card text-card-foreground shadow-[0_22px_64px_-52px_rgba(15,23,42,0.5)]";
const inputClass =
  "h-11 rounded-2xl border-border bg-input text-card-foreground shadow-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10";
const labelClass = "mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground";

function initialsFromName(name: string, email: string) {
  const base = (name || email || "").trim();
  if (!base) return "C";
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export function ConfirmateurSettingsPage() {
  const toast = useToast();
  const setMe = useAuthStore((s) => s.setMe);

  const q = useQuery({ queryKey: ["me"], queryFn: () => me() });

  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [adresse, setAdresse] = useState("");

  useEffect(() => {
    const p = q.data?.profile;
    if (!p) return;
    setNomComplet(p.nomComplet ?? "");
    setTelephone(p.telephone ?? "");
    setCodePostal(p.codePostal ?? "");
    setAdresse(p.adresse ?? "");
  }, [q.data?.profile]);

  const mut = useMutation({
    mutationFn: () => {
      const p = q.data?.profile;
      return updateMyProfile({
        // Le confirmateur n'édite pas sa zone : on préserve les valeurs existantes
        // (gouvernorat/délégation/adresse sont requis par le DTO backend).
        gouvernorat: typeof p?.gouvernorat === "number" ? p.gouvernorat : 0,
        delegation: p?.delegation ?? "",
        adresse: adresse.trim(),
        codePostal: codePostal.trim() ? codePostal.trim() : null,
        pays: p?.pays ?? "Tunisie",
        nomComplet: nomComplet.trim() ? nomComplet.trim() : null,
        telephone: telephone.trim() ? telephone.trim() : null,
        latitude: typeof p?.latitude === "number" ? p.latitude : null,
        longitude: typeof p?.longitude === "number" ? p.longitude : null,
      });
    },
    onSuccess: async () => {
      const data = await me();
      setMe(data);
      await q.refetch();
      toast.success("Paramètres enregistrés");
    },
    onError: (err) => toast.error("Enregistrement impossible", getApiErrorMessage(err)),
  });

  const email = q.data?.email ?? "";
  const initials = useMemo(() => initialsFromName(nomComplet, email), [nomComplet, email]);

  if (q.isLoading) return <Loader />;

  if (q.isError || !q.data) {
    return (
      <div className="w-full space-y-6 pb-10">
        <PremiumHero kicker="Confirmateur" title="Mes paramètres" gradientTitle />
        <div className="ds-alert ds-alert-danger">{getApiErrorMessage(q.error)}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-6 pb-10">
      <PremiumHero
        kicker="Confirmateur / Paramètres"
        title="Mes paramètres"
        gradientTitle
        description="Vos informations de contact. Modifiez-les puis enregistrez."
      />

      <section className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center gap-5 border-b border-border px-6 py-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-600 text-lg font-black text-white shadow-[0_18px_38px_-24px_hsl(var(--primary)/0.8)]">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xl font-extrabold text-card-foreground">
              {nomComplet.trim() || email.split("@")[0]}
            </div>
            <div className="truncate text-sm font-semibold text-muted-foreground">{email}</div>
            <span className="mt-2 inline-flex items-center rounded-full badge-info px-3 py-1 text-xs font-extrabold">
              CONFIRMATEUR
            </span>
          </div>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>Nom et prénom</label>
            <Input
              value={nomComplet}
              onChange={(e) => setNomComplet(e.target.value)}
              placeholder="Ex: Ahmed Ben Ali"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Téléphone</label>
            <Input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Ex: 22123456"
              inputMode="tel"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Code postal</label>
            <Input
              value={codePostal}
              onChange={(e) => setCodePostal(e.target.value)}
              placeholder="Ex: 3000"
              inputMode="numeric"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Adresse</label>
            <textarea
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              rows={3}
              placeholder="Rue, immeuble, ville..."
              className="w-full rounded-2xl border border-border/80 bg-input px-4 py-3 text-sm text-card-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-5">
          <Button
            type="button"
            variant="primary"
            onClick={() => mut.mutate()}
            isLoading={mut.isPending}
            disabled={mut.isPending}
            className="h-11 rounded-2xl px-6 font-extrabold"
          >
            Enregistrer les modifications
          </Button>
        </div>
      </section>
    </div>
  );
}
