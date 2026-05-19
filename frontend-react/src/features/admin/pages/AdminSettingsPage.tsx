import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSettings, putSetting } from "../api/settingsApi";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { useToast } from "../../../shared/components/premium/Toast";
import { PremiumHero } from "../../../shared/components/premium";

const DEFAULT_KEYS: { key: string; description: string; isPublic: boolean; example: string }[] = [
  { key: "company.name", description: "Nom commercial affiché en footer", isPublic: true, example: '"Melek Distribution"' },
  { key: "company.address", description: "Adresse postale du siège", isPublic: true, example: '"Tunis, Tunisie"' },
  { key: "company.phone", description: "Téléphone affiché publiquement", isPublic: true, example: '"+216 71 000 000"' },
  { key: "company.email", description: "Email de contact", isPublic: true, example: '"contact@melek.tn"' },
  { key: "theme.primary", description: "Couleur primaire HEX", isPublic: true, example: '"#3F51B5"' },
  { key: "theme.secondary", description: "Couleur secondaire HEX", isPublic: true, example: '"#F59E0B"' },
  { key: "branding.logoHeaderUrl", description: "URL du logo header", isPublic: true, example: '"/logo-header.png"' },
  { key: "branding.faviconUrl", description: "URL du favicon", isPublic: true, example: '"/favicon.ico"' },
  { key: "footer.copyright", description: "Texte copyright bas de page", isPublic: true, example: '"© 2026 Tous droits réservés"' },
  { key: "seo.title", description: "Titre meta global", isPublic: true, example: '"Melek — E-commerce"' },
  { key: "seo.description", description: "Description meta globale", isPublic: true, example: '"Plateforme de livraison COD"' },
  { key: "languages.enabled", description: "Langues activées", isPublic: true, example: '["fr","en","ar"]' },
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
    },
    onError: (e: any) => toast.error("Échec enregistrement", e?.message),
  });

  const known = new Set(DEFAULT_KEYS.map((k) => k.key));
  const customs = settings.filter((s) => !known.has(s.key));

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Admin"
        title="Paramétrage de l'application"
        description="Configurez le branding, les coordonnées société, le SEO et les paramètres globaux. Les valeurs sont mises en cache 5 minutes."
      />

      {isPending ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : (
        <div className="grid gap-3">
          {DEFAULT_KEYS.map((meta) => {
            const existing = settings.find((s) => s.key === meta.key);
            const draft = drafts[meta.key] ?? existing?.valueJson ?? "";
            return (
              <article key={meta.key} className="app-surface flex flex-col gap-2 p-4 lg:flex-row lg:items-center">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-card-foreground">{meta.key}</div>
                  <div className="text-xs text-muted-foreground">{meta.description}</div>
                  <div className="text-[11px] text-muted-foreground/60">Exemple JSON : <code>{meta.example}</code></div>
                </div>
                <Input
                  className="lg:max-w-xl"
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [meta.key]: e.target.value }))}
                  placeholder={meta.example}
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    let value = draft;
                    if (value.trim() === "") value = "null";
                    try { JSON.parse(value); } catch {
                      toast.error("Valeur JSON invalide");
                      return;
                    }
                    putMut.mutate({
                      key: meta.key,
                      valueJson: value,
                      isPublic: meta.isPublic,
                      description: meta.description,
                    });
                  }}
                  disabled={putMut.isPending}
                >
                  Enregistrer
                </Button>
              </article>
            );
          })}

          {customs.length > 0 && (
            <section className="app-surface p-4">
              <h3 className="mb-2 font-bold">Paramètres personnalisés</h3>
              <div className="space-y-2">
                {customs.map((s) => (
                  <div key={s.key} className="flex items-start gap-3 text-sm">
                    <strong className="w-44 shrink-0">{s.key}</strong>
                    <code className="flex-1 break-all rounded bg-muted/40 px-2 py-1 text-xs">{s.valueJson}</code>
                    <span className="text-xs text-muted-foreground">{s.isPublic ? "public" : "privé"}</span>
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
