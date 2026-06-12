import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSettings, putSetting } from "../api/settingsApi";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { PasswordInput } from "../../../shared/components/PasswordInput";
import { useToast } from "../../../shared/components/premium/Toast";
import { PremiumHero } from "../../../shared/components/premium";

const SETTINGS_TABS = [
  { href: "/admin/settings", label: "Paramètres généraux", exact: true },
  { href: "/admin/settings/sage-x3", label: "Connexion Sage X3", exact: false },
  { href: "/admin/settings/print", label: "Impression", exact: false },
];

function SettingsTabBar() {
  const { pathname } = useLocation();
  return (
    <div className="flex gap-1 rounded-2xl border border-border bg-muted/30 p-1">
      {SETTINGS_TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link key={t.href} to={t.href}
            className={`flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${active ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export const SAGE_X3_SETTING_KEY = "sage.x3.connexion";

type ParamConnexionX3 = {
  Http: number;
  AdresseIP_API: string;
  AdresseIP_X3: string;
  Login: string;
  Password: string;
  Dossier: string;
  Service_Web_BC: string;
  Type_BC: string;
  DefaultDepotNo: number;
  DemoMode: boolean;
  DemoCtNum: string;
  DemoDeNo: number;
  DemoArRef1: string;
  DemoArRef2: string;
};

const DEFAULTS: ParamConnexionX3 = {
  Http: 0,
  AdresseIP_API: "localhost",
  AdresseIP_X3: "localhost:8124",
  Login: "admin",
  Password: "@Zerty1234",
  Dossier: "SEED",
  Service_Web_BC: "SOH",
  Type_BC: "WEB",
  DefaultDepotNo: 1,
  DemoMode: false,
  DemoCtNum: "FR004",
  DemoDeNo: 26,
  DemoArRef1: "DIS007",
  DemoArRef2: "DIS009",
};

function parseStored(valueJson: string | undefined): ParamConnexionX3 {
  if (!valueJson || valueJson === "null") return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(valueJson);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function AdminSageX3SettingsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: settings = [], isPending } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: listSettings,
  });

  const [form, setForm] = useState<ParamConnexionX3>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isPending && !loaded) {
      const row = settings.find((s) => s.key === SAGE_X3_SETTING_KEY);
      setForm(parseStored(row?.valueJson));
      setLoaded(true);
    }
  }, [isPending, settings, loaded]);

  const mut = useMutation({
    mutationFn: (payload: ParamConnexionX3) =>
      putSetting(
        SAGE_X3_SETTING_KEY,
        JSON.stringify(payload),
        false,
        "Paramètres de connexion au serveur Sage X3 (wrapper WEB_API_STAGE_X3)."
      ),
    onSuccess: () => {
      toast.success("Configuration Sage X3 enregistrée");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: any) => toast.error("Échec enregistrement", e?.message),
  });

  function update<K extends keyof ParamConnexionX3>(key: K, value: ParamConnexionX3[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    mut.mutate(form);
  }

  function onReset() {
    setForm({ ...DEFAULTS });
    toast.info("Valeurs par défaut restaurées (non enregistrées)");
  }

  return (
    <div className="w-full space-y-8 pb-10">
      <PremiumHero
        kicker="Admin · Intégration ERP"
        title="Connexion Sage X3"
        description="Configurez les paramètres d'accès au serveur Sage X3 utilisés pour publier les Bons de Livraison lorsque le livreur marque une commande comme livrée."
      />
      <SettingsTabBar />

      {isPending ? (
        <div className="text-sm text-muted-foreground">Chargement de la configuration…</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {/* ── Wrapper API ────────────────────────────────────────────── */}
          <section className="app-surface p-6 space-y-4">
            <header>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Wrapper REST (WEB_API_STAGE_X3)
              </div>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Service HTTP intermédiaire installé sur IIS qui relaie les requêtes vers Sage X3.
              </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Protocole" hint="Http ou Https utilisé par le wrapper">
                <select
                  value={form.Http}
                  onChange={(e) => update("Http", Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value={0}>Http</option>
                  <option value={1}>Https</option>
                </select>
              </Field>

              <Field label="Adresse IP / hôte du wrapper" hint="Ex : localhost ou 192.168.1.10">
                <Input
                  value={form.AdresseIP_API}
                  onChange={(e) => update("AdresseIP_API", e.target.value)}
                  placeholder="localhost"
                />
              </Field>
            </div>
          </section>

          {/* ── Sage X3 ─────────────────────────────────────────────────── */}
          <section className="app-surface p-6 space-y-4">
            <header>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Serveur Sage X3
              </div>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Coordonnées du serveur Sage X3 cible (généralement port 8124).
              </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Adresse IP Sage X3" hint="Ex : localhost:8124">
                <Input
                  value={form.AdresseIP_X3}
                  onChange={(e) => update("AdresseIP_X3", e.target.value)}
                  placeholder="localhost:8124"
                />
              </Field>
              <Field label="Dossier" hint="Code dossier Sage X3 (ex : SEED)">
                <Input
                  value={form.Dossier}
                  onChange={(e) => update("Dossier", e.target.value)}
                  placeholder="SEED"
                />
              </Field>
              <Field label="Login" hint="Utilisateur Sage X3">
                <Input
                  value={form.Login}
                  onChange={(e) => update("Login", e.target.value)}
                  placeholder="admin"
                />
              </Field>
              <Field label="Mot de passe" hint="Mot de passe Sage X3">
                <PasswordInput
                  value={form.Password}
                  onChange={(e) => update("Password", e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            </div>
          </section>

          {/* ── Service web Bon de Commande ─────────────────────────────── */}
          <section className="app-surface p-6 space-y-4">
            <header>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Service web BC
              </div>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Identifiants du service web Sage X3 utilisé pour publier le document.
              </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Service web BC" hint="Nom du service web Sage X3 (ex : SOH)">
                <Input
                  value={form.Service_Web_BC}
                  onChange={(e) => update("Service_Web_BC", e.target.value)}
                  placeholder="SOH"
                />
              </Field>
              <Field label="Type BC" hint="Type de document à émettre (ex : WEB)">
                <Input
                  value={form.Type_BC}
                  onChange={(e) => update("Type_BC", e.target.value)}
                  placeholder="WEB"
                />
              </Field>
              <Field label="Dépôt par défaut (DE_No)" hint="Numéro de dépôt Sage X3 utilisé quand le BL n'en a pas (ex : 1, 26)">
                <Input
                  type="number"
                  value={form.DefaultDepotNo}
                  onChange={(e) => update("DefaultDepotNo", Number(e.target.value) || 0)}
                  placeholder="1"
                />
              </Field>
            </div>
          </section>

          {/* ── Client web par défaut & Mode démo ──────────────────────── */}
          <section className="app-surface p-6 space-y-4">
            <header>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                Client web par défaut & Mode démo
              </div>
              <p className="mt-1 text-xs text-muted-foreground/80">
                Les utilisateurs de l'app ne sont pas des clients Sage individuels — toutes les
                commandes passent sous un même code client générique (ex&nbsp;: FR004). Ce code
                doit exister dans <code>F_COMPTET</code>. Le mode démo force aussi le dépôt et
                les articles aux valeurs statiques.
              </p>
            </header>

            <label className="flex items-start gap-3 rounded-md border border-border bg-background p-3">
              <input
                type="checkbox"
                checked={form.DemoMode}
                onChange={(e) => update("DemoMode", e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold">Mode démo (forcer données statiques)</div>
                <div className="text-[11px] text-muted-foreground/70">
                  Quand activé, chaque BL livré est envoyé à Sage avec les valeurs ci-dessous au lieu
                  des vraies données. Utile pour valider la chaîne d'intégration de bout en bout.
                </div>
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code client fallback (CT_Num)" hint="Ex : FR004 (doit exister dans F_COMPTET Sage)">
                <Input
                  value={form.DemoCtNum}
                  onChange={(e) => update("DemoCtNum", e.target.value)}
                  placeholder="FR004"
                />
              </Field>
              <Field label="Dépôt démo (DE_No)" hint="Ex : 26">
                <Input
                  type="number"
                  value={form.DemoDeNo}
                  onChange={(e) => update("DemoDeNo", Number(e.target.value) || 0)}
                  placeholder="26"
                />
              </Field>
              <Field label="Article démo 1 (AR_Ref)" hint="Ex : DIS007">
                <Input
                  value={form.DemoArRef1}
                  onChange={(e) => update("DemoArRef1", e.target.value)}
                  placeholder="DIS007"
                />
              </Field>
              <Field label="Article démo 2 (AR_Ref)" hint="Ex : DIS009">
                <Input
                  value={form.DemoArRef2}
                  onChange={(e) => update("DemoArRef2", e.target.value)}
                  placeholder="DIS009"
                />
              </Field>
            </div>
          </section>

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Ces paramètres sont privés et chiffrés en base. Ils sont relus à chaque appel Sage.
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onReset}>
                Restaurer les valeurs par défaut
              </Button>
              <Button type="submit" variant="primary" disabled={mut.isPending}>
                {mut.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-card-foreground">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground/70">{hint}</span>}
    </label>
  );
}
