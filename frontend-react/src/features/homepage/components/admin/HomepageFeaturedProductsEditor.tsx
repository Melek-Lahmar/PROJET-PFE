import { useMemo, useState } from "react";
import { Button } from "../../../../shared/components/Button";
import { Input } from "../../../../shared/components/Input";
import type { Article } from "../../../catalog/types/article";
import type { HomepageFeaturedProductsPayload, HomepageSection } from "../../types/homepage";
import {
  AdminField,
  AdminSectionShell,
  AdminTextarea,
  AdminToggle,
  CtaFieldsEditor,
  ItemToolbar,
} from "./HomepageAdminPrimitives";

function getArticleSubtitle(article: Article) {
  const parts = [article.aR_Ref, article.fA_CodeFamille].filter(Boolean);
  return parts.join(" • ");
}

export function HomepageFeaturedProductsEditor({
  section,
  articles,
  onChange,
}: {
  section: HomepageSection;
  articles: Article[];
  onChange: (section: HomepageSection) => void;
}) {
  const payload = section.payload as HomepageFeaturedProductsPayload;
  const [search, setSearch] = useState("");

  const selectedRefs = payload.articleRefs ?? [];
  const selectedArticles = useMemo(
    () => selectedRefs.map((ref) => articles.find((article) => article.aR_Ref === ref)).filter((article): article is Article => Boolean(article)),
    [articles, selectedRefs],
  );

  const availableArticles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return articles
      .filter((article) => !selectedRefs.includes(article.aR_Ref))
      .filter((article) => {
        if (!keyword) return true;
        return [article.aR_Ref, article.aR_Design, article.fA_CodeFamille, article.aR_CodeBarre]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .slice(0, 24);
  }, [articles, search, selectedRefs]);

  const updateRefs = (nextRefs: string[]) => {
    onChange({ ...section, payload: { ...payload, articleRefs: nextRefs } });
  };

  return (
    <div className="space-y-4">
      <AdminSectionShell title="Sélection d’articles" subtitle="Sous le hero, pour mettre en avant des produits choisis manuellement.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AdminField label="Titre de section">
            <Input value={payload.title ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, title: e.target.value } })} />
          </AdminField>
          <AdminField label="Sous-titre">
            <Input value={payload.subtitle ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, subtitle: e.target.value } })} />
          </AdminField>
          <AdminField label="Nombre maximum">
            <Input type="number" min="1" max="12" value={payload.maxItems} onChange={(e) => onChange({ ...section, payload: { ...payload, maxItems: Number(e.target.value || 8) } })} />
          </AdminField>
        </div>
        <AdminField label="Description">
          <AdminTextarea value={payload.description ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, description: e.target.value } })} />
        </AdminField>
        <div className="flex flex-wrap gap-3">
          <AdminToggle label="Afficher les prix" checked={payload.showPrices} onChange={(showPrices) => onChange({ ...section, payload: { ...payload, showPrices } })} />
          <AdminToggle label="Afficher les badges" checked={payload.showBadges} onChange={(showBadges) => onChange({ ...section, payload: { ...payload, showBadges } })} />
        </div>
      </AdminSectionShell>

      <div className="grid gap-4 xl:grid-cols-2">
        <CtaFieldsEditor
          label="CTA “Voir tout”"
          value={payload.viewAllCta ?? { text: "Voir tout", href: "/articles" }}
          onChange={(viewAllCta) => onChange({ ...section, payload: { ...payload, viewAllCta } })}
        />
        <AdminSectionShell title="Message vide" subtitle="Affiché si aucun article n’est sélectionné.">
          <AdminField label="Texte">
            <AdminTextarea value={payload.emptyMessage ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, emptyMessage: e.target.value } })} />
          </AdminField>
        </AdminSectionShell>
      </div>

      <AdminSectionShell title="Articles sélectionnés" subtitle="L’ordre ici détermine l’ordre d’affichage public.">
        {selectedArticles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card px-4 py-6 text-sm text-muted-foreground">
            Aucun article sélectionné pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedArticles.map((article, index) => (
              <div key={article.aR_Ref} className="rounded-2xl border border-border/70 bg-card px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Position {index + 1}</div>
                    <div className="mt-1 text-base font-bold text-card-foreground">{article.aR_Design}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{getArticleSubtitle(article)}</div>
                  </div>
                  <ItemToolbar
                    onMoveUp={() => {
                      const next = [...selectedRefs];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      updateRefs(next);
                    }}
                    onMoveDown={() => {
                      const next = [...selectedRefs];
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      updateRefs(next);
                    }}
                    onDelete={() => updateRefs(selectedRefs.filter((ref) => ref !== article.aR_Ref))}
                    disableUp={index === 0}
                    disableDown={index === selectedArticles.length - 1}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSectionShell>

      <AdminSectionShell title="Ajouter des articles" subtitle="Recherche rapide parmi les articles disponibles.">
        <AdminField label="Recherche">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Référence, désignation, famille..." />
        </AdminField>

        <div className="grid gap-3 md:grid-cols-2">
          {availableArticles.map((article) => (
            <div key={article.aR_Ref} className="rounded-2xl border border-border/70 bg-card px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-card-foreground">{article.aR_Design}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{getArticleSubtitle(article)}</div>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => updateRefs([...selectedRefs, article.aR_Ref])}>
                  Ajouter
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AdminSectionShell>
    </div>
  );
}