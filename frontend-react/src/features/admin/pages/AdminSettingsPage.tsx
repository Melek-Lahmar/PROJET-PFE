import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSettings, putSetting } from "../api/settingsApi";
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

type SettingMeta = { key: string; description: string; isPublic: boolean; example: string; group: string };

const DEFAULT_KEYS: SettingMeta[] = [
  // ── Identité société ──────────────────────────────────────────────────────
  { group: "Société", key: "company.name", description: "Nom commercial (footer + logo)", isPublic: true, example: '"Melek Distribution"' },
  { group: "Société", key: "company.tagline", description: "Sous-titre de la marque (sous le logo)", isPublic: true, example: '"Catalogue & Commandes"' },
  { group: "Société", key: "company.email", description: "Email de contact public", isPublic: true, example: '"contact@melek.tn"' },
  { group: "Société", key: "company.phone", description: "Téléphone affiché publiquement", isPublic: true, example: '"+216 71 000 000"' },
  { group: "Société", key: "company.address", description: "Adresse postale du siège", isPublic: true, example: '"Sfax, Tunisie"' },
  // ── Footer ────────────────────────────────────────────────────────────────
  { group: "Footer", key: "footer.description", description: "Texte descriptif affiché sous le logo en footer", isPublic: true, example: '"Plateforme e-commerce connectée à Sage X3..."' },
  { group: "Footer", key: "footer.copyright", description: "Ligne copyright (barre inférieure)", isPublic: true, example: '"© 2026 Melek Distribution — Tous droits réservés"' },
  { group: "Footer", key: "footer.badge", description: "Badge technologique (ex: ERP utilisé)", isPublic: true, example: '"Propulsé par Sage X3"' },
  { group: "Footer", key: "footer.social.linkedin", description: "URL LinkedIn (laisser vide pour masquer)", isPublic: true, example: '"https://linkedin.com/company/melek"' },
  { group: "Footer", key: "footer.social.facebook", description: "URL Facebook (laisser vide pour masquer)", isPublic: true, example: '"https://facebook.com/melek"' },
  { group: "Footer", key: "footer.social.twitter", description: "URL Twitter / X (laisser vide pour masquer)", isPublic: true, example: '"https://twitter.com/melek"' },
  // ── Branding ──────────────────────────────────────────────────────────────
  { group: "Branding", key: "branding.logoHeaderUrl", description: "URL du logo header (laisser vide = monogramme)", isPublic: true, example: '"/logo-header.png"' },
  { group: "Branding", key: "branding.faviconUrl", description: "URL du favicon", isPublic: true, example: '"/favicon.ico"' },
  { group: "Branding", key: "theme.primary", description: "Couleur primaire HEX (nécessite rechargement)", isPublic: true, example: '"#2563eb"' },
  // ── SEO ───────────────────────────────────────────────────────────────────
  { group: "SEO", key: "seo.title", description: "Titre meta global de l'application", isPublic: true, example: '"Melek — E-commerce"' },
  { group: "SEO", key: "seo.description", description: "Description meta globale", isPublic: true, example: '"Plateforme de livraison COD"' },
];

export function AdminSettingsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: settings = [], isPending } = useQuery({ queryKey: ["admin-settings"], queryFn: listSettings });

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const putMut = useMutation({
    mutationFn: (args: { key: string; valueJson: string; isPublic: boolean; description?: string }) =>
      putSetting(args.key, args.valueJson, args.isPublic, args.description),
    onSuccess: () => {
      toast.success("Paramètre enregistré");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (e: any) => toast.error("Échec enregistrement", e?.message),
  });

  const known = new Set(DEFAULT_KEYS.map((k) => k.key));
  const customs = settings.filter((s) => !known.has(s.key));

  const groups = Array.from(new Set(DEFAULT_KEYS.map((k) => k.group)));

  function saveSetting(meta: SettingMeta) {
    let value = drafts[meta.key] ?? settings.find((s) => s.key === meta.key)?.valueJson ?? "";
    if (value.trim() === "") value = "null";
    try { JSON.parse(value); } catch {
      toast.error("Valeur JSON invalide", `Clé : ${meta.key}`);
      return;
    }
    putMut.mutate({ key: meta.key, valueJson: value, isPublic: meta.isPublic, description: meta.description });
  }

  return (
    <div className="w-full space-y-8 pb-10">
      <PremiumHero
        kicker="Admin"
        title="Paramétrage de l'application"
        description="Configurez le branding, le footer, les coordonnées et le SEO. Toutes les valeurs sont JSON. Elles sont mises en cache 5 minutes côté client."
      />
      <SettingsTabBar />

      {isPending ? (
        <div className="text-sm text-muted-foreground">Chargement des paramètres...</div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group}>
              <div className="mb-3 flex items-center gap-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{group}</div>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              <div className="grid gap-2">
                {DEFAULT_KEYS.filter((m) => m.group === group).map((meta) => {
                  const existing = settings.find((s) => s.key === meta.key);
                  const draft = drafts[meta.key] ?? existing?.valueJson ?? "";
                  const isDirty = drafts[meta.key] !== undefined && drafts[meta.key] !== (existing?.valueJson ?? "");
                  return (
                    <article
                      key={meta.key}
                      className={`app-surface flex flex-col gap-3 p-4 transition-colors lg:flex-row lg:items-center ${isDirty ? "border-primary/30 bg-primary/[0.03]" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-bold text-card-foreground">{meta.key}</code>
                          {isDirty && (
                            <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                              modifié
                            </span>
                          )}
                          {existing?.valueJson && existing.valueJson !== "null" && !isDirty && (
                            <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                              défini
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{meta.description}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground/50">
                          Exemple&nbsp;: <code className="font-mono">{meta.example}</code>
                        </div>
                      </div>
                      <div className="flex flex-1 items-center gap-2 lg:max-w-lg">
                        <Input
                          value={draft}
                          onChange={(e) => setDrafts((d) => ({ ...d, [meta.key]: e.target.value }))}
                          placeholder={meta.example}
                          className="flex-1"
                        />
                        <Button
                          variant="primary"
                          onClick={() => saveSetting(meta)}
                          disabled={putMut.isPending}
                        >
                          Sauvegarder
                        </Button>
                        {isDirty && (
                          <Button
                            variant="ghost"
                            onClick={() => setDrafts((d) => { const n = { ...d }; delete n[meta.key]; return n; })}
                          >
                            Annuler
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {customs.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-3">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Personnalisés</div>
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
      )}
    </div>
  );
}
