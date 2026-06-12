import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDeliveryFee,
  listSettings,
  putDeliveryFee,
  putSetting,
  type AppSetting,
} from "../api/settingsApi";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { useToast } from "../../../shared/components/premium/Toast";
import { PremiumHero } from "../../../shared/components/premium";

const SETTINGS_TABS = [
  { href: "/admin/settings", label: "Paramètres généraux", exact: true },
  { href: "/admin/settings/sage-x3", label: "Connexion Sage X3", exact: false },
  { href: "/admin/settings/print", label: "Impression", exact: false },
  { href: "/admin/settings/livraison", label: "Livraison", exact: false },
  { href: "/admin/settings/reclamations", label: "Réclamations", exact: false },
];

function SettingsTabBar() {
  const { pathname } = useLocation();
  return (
    <div className="flex gap-1 rounded-2xl border border-border bg-muted/30 p-1">
      {SETTINGS_TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            to={t.href}
            className={`flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${
              active
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

type SectionKey = "footer" | "delivery";

type FooterField = {
  key: string;
  label: string;
  description: string;
  fallback: string;
};

const FOOTER_FIELDS: FooterField[] = [
  { key: "company.name", label: "Nom société", description: "Nom commercial affiché dans le footer.", fallback: "E-commerce" },
  { key: "company.address", label: "Adresse", description: "Adresse publique de la société.", fallback: "Sfax, Tunisie" },
  { key: "company.phone", label: "Téléphone", description: "Téléphone public de contact.", fallback: "+216 00 000 000" },
  { key: "company.email", label: "Email", description: "Email public de support ou contact.", fallback: "support@ecommerce.tn" },
  {
    key: "footer.copyright",
    label: "Copyright",
    description: "Texte affiché dans la barre inférieure du footer.",
    fallback: `© ${new Date().getFullYear()} E-commerce • Projet PFE`,
  },
];

const PUBLIC_SETTING_KEYS = new Set([
  ...FOOTER_FIELDS.map((field) => field.key),
  "checkout.deliveryFee.home",
]);

function parseStringSetting(setting: AppSetting | undefined, fallback: string) {
  if (!setting?.valueJson || setting.valueJson === "null") return fallback;
  try {
    const parsed = JSON.parse(setting.valueJson);
    return typeof parsed === "string" ? parsed : String(parsed ?? fallback);
  } catch {
    return setting.valueJson;
  }
}

function IconFooter() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 15h18" />
      <path d="M7 8h6" />
      <path d="M7 18h3" />
      <path d="M14 18h3" />
    </svg>
  );
}

function IconDeliveryFee() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h3l4 4v3h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M8 11h2" />
      <path d="M9 10v2" />
    </svg>
  );
}

function SettingsCard({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`app-surface flex min-h-[168px] gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-xl ${
        active ? "border-primary/40 bg-primary/[0.06]" : ""
      }`}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-black text-card-foreground">{title}</span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

export function AdminSettingsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState<SectionKey>("footer");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [deliveryDraft, setDeliveryDraft] = useState<string | null>(null);

  const { data: settings = [], isPending } = useQuery({ queryKey: ["admin-settings"], queryFn: listSettings });
  const deliveryFeeQuery = useQuery({ queryKey: ["admin-settings", "delivery-fee"], queryFn: getDeliveryFee });

  const deliveryDraftValue = deliveryDraft ?? deliveryFeeQuery.data?.value.toFixed(3) ?? "";

  const settingByKey = useMemo(() => {
    const map = new Map<string, AppSetting>();
    for (const setting of settings) map.set(setting.key, setting);
    return map;
  }, [settings]);

  const footerValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const field of FOOTER_FIELDS) {
      out[field.key] = drafts[field.key] ?? parseStringSetting(settingByKey.get(field.key), field.fallback);
    }
    return out;
  }, [drafts, settingByKey]);

  const footerMut = useMutation({
    mutationFn: async () => {
      for (const field of FOOTER_FIELDS) {
        await putSetting(field.key, JSON.stringify(footerValues[field.key] ?? ""), true, field.description);
      }
    },
    onSuccess: () => {
      toast.success("Paramètres du footer enregistrés");
      setDrafts({});
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (e: any) => toast.error("Échec enregistrement footer", e?.message),
  });

  const deliveryMut = useMutation({
    mutationFn: async () => {
      const value = Number(deliveryDraftValue.replace(",", "."));
      if (!Number.isFinite(value)) throw new Error("Valeur numérique invalide.");
      return putDeliveryFee(value);
    },
    onSuccess: (saved) => {
      toast.success("Frais de livraison enregistré", `${saved.value.toFixed(3)} TND`);
      setDeliveryDraft(saved.value.toFixed(3));
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-settings", "delivery-fee"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (e: any) => toast.error("Échec enregistrement frais livraison", e?.response?.data?.message ?? e?.message),
  });

  const customs = settings.filter((setting) => !PUBLIC_SETTING_KEYS.has(setting.key));

  return (
    <div className="w-full space-y-8 pb-10">
      <PremiumHero
        kicker="Admin"
        title="Paramétrage de l'application"
        description="Personnalisez les informations publiques du footer et le frais fixe appliqué aux nouvelles commandes livrées à domicile."
      />
      <SettingsTabBar />

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsCard
          active={activeSection === "footer"}
          title="Paramétrage du footer"
          description="Modifier les informations publiques affichées dans le pied de page : nom société, adresse, téléphone, email, copyright."
          icon={<IconFooter />}
          onClick={() => setActiveSection("footer")}
        />
        <SettingsCard
          active={activeSection === "delivery"}
          title="Frais de livraison"
          description="Modifier le frais fixe appliqué aux nouvelles commandes livrées à domicile."
          icon={<IconDeliveryFee />}
          onClick={() => setActiveSection("delivery")}
        />
      </div>

      {isPending ? (
        <div className="text-sm text-muted-foreground">Chargement des paramètres...</div>
      ) : activeSection === "footer" ? (
        <section className="app-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
            <div>
              <div className="app-kicker">Paramètres du footer</div>
              <h2 className="mt-1 text-2xl font-black text-card-foreground">Informations publiques</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Les champs sont enregistrés comme chaînes JSON valides et exposés via les settings publics.
              </p>
            </div>
            <Button type="button" variant="primary" onClick={() => footerMut.mutate()} isLoading={footerMut.isPending}>
              Sauvegarder le footer
            </Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {FOOTER_FIELDS.map((field) => (
              <label key={field.key} className={field.key === "footer.copyright" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                <span className="block text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                  {field.label}
                </span>
                <Input
                  value={footerValues[field.key] ?? ""}
                  onChange={(e) => setDrafts((current) => ({ ...current, [field.key]: e.target.value }))}
                  placeholder={field.fallback}
                />
                <span className="block text-xs leading-5 text-muted-foreground">{field.description}</span>
              </label>
            ))}
          </div>
        </section>
      ) : (
        <section className="app-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
            <div>
              <div className="app-kicker">Frais de livraison</div>
              <h2 className="mt-1 text-2xl font-black text-card-foreground">Livraison à domicile</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Cette valeur est utilisée uniquement pour les nouveaux BC. Les documents existants gardent leur snapshot.
              </p>
            </div>
            <span className="rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-bold text-success">
              Public
            </span>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <label className="space-y-2">
              <span className="block text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                Frais fixe domicile (TND)
              </span>
              <Input
                type="number"
                min="0"
                max="999.999"
                step="0.001"
                value={deliveryDraftValue}
                onChange={(e) => setDeliveryDraft(e.target.value)}
                placeholder="8.000"
              />
              <span className="block text-xs leading-5 text-muted-foreground">
                Valeur positive avec 3 décimales maximum. Retrait dépôt : 0 TND.
              </span>
            </label>
            <Button
              type="button"
              variant="primary"
              className="h-11 rounded-2xl"
              onClick={() => deliveryMut.mutate()}
              isLoading={deliveryMut.isPending}
            >
              Enregistrer le frais
            </Button>
          </div>

          <div className="mt-5 rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
            Clé publique : <code className="font-mono text-card-foreground">checkout.deliveryFee.home</code>
            {deliveryFeeQuery.data?.updatedAt ? (
              <span> • Dernière mise à jour : {new Date(deliveryFeeQuery.data.updatedAt).toLocaleString("fr-FR")}</span>
            ) : null}
          </div>
        </section>
      )}

      {customs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-3">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Autres paramètres</div>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <div className="app-surface divide-y divide-border/60">
            {customs.map((s) => (
              <div key={s.key} className="flex items-start gap-3 px-4 py-3 text-sm">
                <code className="w-52 shrink-0 font-bold text-card-foreground">{s.key}</code>
                <code className="flex-1 break-all text-xs text-muted-foreground">{s.valueJson}</code>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.isPublic ? "bg-success/10 text-success" : "bg-muted/60 text-muted-foreground"}`}>
                  {s.isPublic ? "public" : "privé"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
