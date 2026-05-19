import { Button } from '../../../../shared/components/Button';
import { Card } from '../../../../shared/components/Card';
import { Input } from '../../../../shared/components/Input';
import type { Article } from '../../../catalog/types/article';
import type { Catalogue } from '../../../catalog/types/catalogue';
import { HomepageImageField } from './HomepageImageField';
import type {
  HomepageAdvantagesPayload,
  HomepageAudiencesPayload,
  HomepageBrandItem,
  HomepageBrandsPayload,
  HomepageCarouselPayload,
  HomepageCarouselSlide,
  HomepageCataloguesPayload,
  HomepageCta,
  HomepageFeaturedCategoriesPayload,
  HomepageFeaturedProductsPayload,
  HomepageFinalCtaPayload,
  HomepageHeroPayload,
  HomepagePromoBannerPayload,
  HomepageSection,
  HomepageStatItem,
  HomepageStatsPayload,
} from '../../types/homepage';
import { createLocalId, getHomepageSectionLabel } from '../../types/homepage';

type Props = {
  section: HomepageSection | null;
  availableArticles: Article[];
  availableCatalogues: Catalogue[];
  onChange: (next: HomepageSection) => void;
};

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[110px] w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 py-3 text-sm text-card-foreground shadow-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 ${props.className ?? ''}`}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="app-kicker">{label}</span>
      {children}
    </label>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-4 p-5">
      <div className="text-lg font-black text-card-foreground">{title}</div>
      {children}
    </Card>
  );
}

function CtaFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: HomepageCta | null;
  onChange: (next: HomepageCta) => void;
}) {
  const cta = value ?? { text: '', href: '' };

  return (
    <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-2">
      <Field label={`${label} — texte`}>
        <Input value={cta.text ?? ''} onChange={(e) => onChange({ ...cta, text: e.target.value })} />
      </Field>
      <Field label={`${label} — lien`}>
        <Input value={cta.href ?? ''} onChange={(e) => onChange({ ...cta, href: e.target.value })} />
      </Field>
    </div>
  );
}

function CommonSectionFields({ section, onChange }: { section: HomepageSection; onChange: (next: HomepageSection) => void }) {
  return (
    <SectionCard title="Paramètres généraux">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Nom admin du bloc">
          <Input value={section.name ?? ''} onChange={(e) => onChange({ ...section, name: e.target.value })} />
        </Field>

        <Field label="Type">
          <Input value={getHomepageSectionLabel(section.type)} readOnly />
        </Field>

        <Field label="Layout variant">
          <Input
            value={section.layoutVariant ?? ''}
            onChange={(e) => onChange({ ...section, layoutVariant: e.target.value })}
            placeholder="hero-split, dark, compact..."
          />
        </Field>

        <Field label="Theme variant">
          <Input
            value={section.themeVariant ?? ''}
            onChange={(e) => onChange({ ...section, themeVariant: e.target.value })}
            placeholder="light, dark, accent..."
          />
        </Field>

        <Field label="Début de visibilité">
          <Input
            type="datetime-local"
            value={toDateTimeLocal(section.startAt)}
            onChange={(e) => onChange({ ...section, startAt: fromDateTimeLocal(e.target.value) })}
          />
        </Field>

        <Field label="Fin de visibilité">
          <Input
            type="datetime-local"
            value={toDateTimeLocal(section.endAt)}
            onChange={(e) => onChange({ ...section, endAt: fromDateTimeLocal(e.target.value) })}
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-border/70 px-4 py-3 text-sm text-card-foreground">
        <input
          type="checkbox"
          checked={section.isActive}
          onChange={(e) => onChange({ ...section, isActive: e.target.checked })}
        />
        Section active sur la homepage
      </label>
    </SectionCard>
  );
}

export function HomepageSectionEditorPanel({ section, availableArticles, availableCatalogues, onChange }: Props) {
  if (!section) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Sélectionne une section à gauche pour commencer son édition.
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <CommonSectionFields section={section} onChange={onChange} />
      {renderTypeSpecificEditor(section, availableArticles, availableCatalogues, onChange)}
    </div>
  );
}

function renderTypeSpecificEditor(
  section: HomepageSection,
  availableArticles: Article[],
  availableCatalogues: Catalogue[],
  onChange: (next: HomepageSection) => void,
) {
  switch (section.type) {
    case 'hero':
      return renderHeroEditor(section, onChange);
    case 'carousel':
      return renderCarouselEditor(section, onChange);
    case 'featuredCategories':
      return renderFeaturedCategoriesEditor(section, availableCatalogues, onChange);
    case 'featuredProducts':
      return renderFeaturedProductsEditor(section, availableArticles, onChange);
    case 'promoBanner':
      return renderPromoBannerEditor(section, onChange);
    case 'audiences':
      return renderAudiencesEditor(section, onChange);
    case 'advantages':
      return renderAdvantagesEditor(section, onChange);
    case 'catalogues':
      return renderCataloguesEditor(section, availableCatalogues, onChange);
    case 'brands':
      return renderBrandsEditor(section, onChange);
    case 'stats':
      return renderStatsEditor(section, onChange);
    case 'finalCta':
      return renderFinalCtaEditor(section, onChange);
    default:
      return null;
  }
}

function renderHeroEditor(section: HomepageSection, onChange: (next: HomepageSection) => void) {
  const payload = section.payload as HomepageHeroPayload;
  const patch = (partial: Partial<HomepageHeroPayload>) => onChange({ ...section, payload: { ...payload, ...partial } });

  return (
    <SectionCard title="Contenu du hero">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Badge marketing">
          <Input value={payload.badgeText ?? ''} onChange={(e) => patch({ badgeText: e.target.value })} />
        </Field>
        <Field label="Titre principal">
          <Input value={payload.title ?? ''} onChange={(e) => patch({ title: e.target.value })} />
        </Field>
        <Field label="Sous-titre">
          <Input value={payload.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} />
        </Field>
        <Field label="Texte de réassurance">
          <Input value={payload.reassuranceText ?? ''} onChange={(e) => patch({ reassuranceText: e.target.value })} />
        </Field>
        <Field label="Alignement du texte">
          <select
            className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm"
            value={payload.textAlignment ?? 'left'}
            onChange={(e) => patch({ textAlignment: e.target.value as HomepageHeroPayload['textAlignment'] })}
          >
            <option value="left">Gauche</option>
            <option value="center">Centre</option>
            <option value="right">Droite</option>
          </select>
        </Field>
        <Field label="Position du contenu">
          <select
            className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm"
            value={payload.contentPosition ?? 'left'}
            onChange={(e) => patch({ contentPosition: e.target.value as HomepageHeroPayload['contentPosition'] })}
          >
            <option value="left">Gauche</option>
            <option value="center">Centre</option>
            <option value="right">Droite</option>
          </select>
        </Field>
      </div>

      <Field label="Description">
        <Textarea value={payload.description ?? ''} onChange={(e) => patch({ description: e.target.value })} />
      </Field>

      <Field label="Overlay opacity (0 à 0.85)">
        <Input
          type="number"
          min={0}
          max={0.85}
          step={0.05}
          value={payload.overlayOpacity ?? 0}
          onChange={(e) => patch({ overlayOpacity: Number(e.target.value) })}
        />
      </Field>

      <CtaFields label="CTA principal" value={payload.primaryCta} onChange={(next) => patch({ primaryCta: next })} />
      <CtaFields label="CTA secondaire" value={payload.secondaryCta} onChange={(next) => patch({ secondaryCta: next })} />

      <HomepageImageField label="Image desktop" value={payload.image} onChange={(next) => patch({ image: next })} />
      <HomepageImageField label="Image mobile" value={payload.mobileImage} onChange={(next) => patch({ mobileImage: next })} />
    </SectionCard>
  );
}

function renderCarouselEditor(section: HomepageSection, onChange: (next: HomepageSection) => void) {
  const payload = section.payload as HomepageCarouselPayload;
  const patch = (partial: Partial<HomepageCarouselPayload>) => onChange({ ...section, payload: { ...payload, ...partial } });

  const updateSlide = (slideId: string, updater: (slide: HomepageCarouselSlide) => HomepageCarouselSlide) => {
    patch({
      slides: payload.slides
        .map((slide) => (slide.id === slideId ? updater(slide) : slide))
        .map((slide, index) => ({ ...slide, displayOrder: index + 1 })),
    });
  };

  const slides = [...payload.slides].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <SectionCard title="Carrousel marketing">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Titre de section">
          <Input value={payload.title ?? ''} onChange={(e) => patch({ title: e.target.value })} />
        </Field>
        <Field label="Sous-titre">
          <Input value={payload.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} />
        </Field>
        <Field label="Autoplay delay (ms)">
          <Input
            type="number"
            value={payload.autoplayDelayMs}
            onChange={(e) => patch({ autoplayDelayMs: Number(e.target.value) || 5000 })}
          />
        </Field>
        <div className="flex flex-wrap gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={payload.autoplay} onChange={(e) => patch({ autoplay: e.target.checked })} /> Autoplay</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={payload.showDots} onChange={(e) => patch({ showDots: e.target.checked })} /> Points</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={payload.showArrows} onChange={(e) => patch({ showArrows: e.target.checked })} /> Flèches</label>
        </div>
      </div>

      <div className="space-y-4">
        {slides.map((slide, index) => (
          <div key={slide.id} className="space-y-4 rounded-3xl border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-base font-black text-card-foreground">Slide {index + 1}</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => patch({ slides: moveInArray(slides, slide.id, -1) })}
                  disabled={index === 0}
                >
                  Monter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => patch({ slides: moveInArray(slides, slide.id, 1) })}
                  disabled={index === slides.length - 1}
                >
                  Descendre
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => patch({ slides: slides.filter((item) => item.id !== slide.id).map((item, idx) => ({ ...item, displayOrder: idx + 1 })) })}
                >
                  Supprimer
                </Button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <input
                type="checkbox"
                checked={slide.isActive}
                onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, isActive: e.target.checked }))}
              />
              Slide actif
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Titre slide">
                <Input value={slide.title ?? ''} onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, title: e.target.value }))} />
              </Field>
              <Field label="Sous-titre slide">
                <Input value={slide.subtitle ?? ''} onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, subtitle: e.target.value }))} />
              </Field>
              <Field label="Début visibilité">
                <Input
                  type="datetime-local"
                  value={toDateTimeLocal(slide.startAt)}
                  onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, startAt: fromDateTimeLocal(e.target.value) }))}
                />
              </Field>
              <Field label="Fin visibilité">
                <Input
                  type="datetime-local"
                  value={toDateTimeLocal(slide.endAt)}
                  onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, endAt: fromDateTimeLocal(e.target.value) }))}
                />
              </Field>
            </div>

            <Field label="Description">
              <Textarea value={slide.description ?? ''} onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, description: e.target.value }))} />
            </Field>

            <CtaFields label="CTA du slide" value={slide.primaryCta} onChange={(next) => updateSlide(slide.id, (current) => ({ ...current, primaryCta: next }))} />
            <HomepageImageField label="Image desktop du slide" value={slide.image} onChange={(next) => updateSlide(slide.id, (current) => ({ ...current, image: next }))} />
            <HomepageImageField label="Image mobile du slide" value={slide.mobileImage} onChange={(next) => updateSlide(slide.id, (current) => ({ ...current, mobileImage: next }))} />
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => patch({
          slides: [
            ...slides,
            {
              id: createLocalId('slide'),
              title: `Slide ${slides.length + 1}`,
              subtitle: '',
              description: '',
              primaryCta: { text: '', href: '' },
              image: { sourceType: 'url', url: '', cloudinaryPublicId: '', alt: '' },
              mobileImage: { sourceType: 'url', url: '', cloudinaryPublicId: '', alt: '' },
              displayOrder: slides.length + 1,
              isActive: true,
              startAt: null,
              endAt: null,
            },
          ],
        })}
      >
        Ajouter un slide
      </Button>
    </SectionCard>
  );
}

function renderFeaturedCategoriesEditor(section: HomepageSection, availableCatalogues: Catalogue[], onChange: (next: HomepageSection) => void) {
  const payload = section.payload as HomepageFeaturedCategoriesPayload;
  const patch = (partial: Partial<HomepageFeaturedCategoriesPayload>) => onChange({ ...section, payload: { ...payload, ...partial } });
  const selectedNos = payload.items.map((item) => item.catalogueNo);

  const toggleCatalogue = (catalogue: Catalogue) => {
    if (selectedNos.includes(catalogue.cL_No)) {
      patch({
        items: payload.items.filter((item) => item.catalogueNo !== catalogue.cL_No).map((item, index) => ({ ...item, displayOrder: index + 1 })),
      });
      return;
    }

    patch({
      items: [
        ...payload.items,
        {
          id: createLocalId('cat'),
          catalogueNo: catalogue.cL_No,
          label: catalogue.cL_Intitule,
          description: '',
          image: { sourceType: 'url', url: '', cloudinaryPublicId: '', alt: catalogue.cL_Intitule },
          targetHref: `/articles?catalogueNo=${catalogue.cL_No}`,
          displayOrder: payload.items.length + 1,
          isActive: true,
        },
      ],
    });
  };

  return (
    <SectionCard title="Catégories mises en avant">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Titre"><Input value={payload.title ?? ''} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="Sous-titre"><Input value={payload.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} /></Field>
        <Field label="Mode d’affichage">
          <select className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm" value={payload.displayMode} onChange={(e) => patch({ displayMode: e.target.value as HomepageFeaturedCategoriesPayload['displayMode'] })}>
            <option value="grid">Grille</option>
            <option value="slider">Slider</option>
          </select>
        </Field>
        <Field label="Nombre maximum"><Input type="number" value={payload.maxItems} onChange={(e) => patch({ maxItems: Number(e.target.value) || 1 })} /></Field>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
          <div className="text-base font-black text-card-foreground">Sélection des catalogues</div>
          <div className="max-h-[340px] space-y-2 overflow-auto pr-1">
            {availableCatalogues.map((catalogue) => {
              const checked = selectedNos.includes(catalogue.cL_No);
              return (
                <label key={catalogue.cL_No} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm">
                  <input type="checkbox" checked={checked} onChange={() => toggleCatalogue(catalogue)} />
                  <span>
                    <span className="block font-semibold text-card-foreground">{catalogue.cL_Intitule}</span>
                    <span className="text-muted-foreground">{catalogue.cL_Code} • Niveau {catalogue.cL_Niveau}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {payload.items.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">Aucune catégorie sélectionnée.</Card>
          ) : payload.items.map((item, index) => (
            <div key={item.id} className="space-y-4 rounded-3xl border border-border/70 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-base font-black text-card-foreground">Catégorie #{index + 1}</div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => patch({ items: moveInArray(payload.items, item.id, -1) })} disabled={index === 0}>Monter</Button>
                  <Button type="button" variant="outline" onClick={() => patch({ items: moveInArray(payload.items, item.id, 1) })} disabled={index === payload.items.length - 1}>Descendre</Button>
                  <Button type="button" variant="destructive" onClick={() => patch({ items: payload.items.filter((entry) => entry.id !== item.id).map((entry, idx) => ({ ...entry, displayOrder: idx + 1 })) })}>Supprimer</Button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground"><input type="checkbox" checked={item.isActive} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, isActive: e.target.checked } : entry) })} /> Active</label>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Libellé homepage"><Input value={item.label ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, label: e.target.value } : entry) })} /></Field>
                <Field label="Lien cible"><Input value={item.targetHref ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, targetHref: e.target.value } : entry) })} /></Field>
              </div>
              <Field label="Description"><Textarea value={item.description ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, description: e.target.value } : entry) })} /></Field>
              <HomepageImageField label="Image de catégorie" value={item.image} onChange={(next) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, image: next } : entry) })} />
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function renderFeaturedProductsEditor(section: HomepageSection, availableArticles: Article[], onChange: (next: HomepageSection) => void) {
  const payload = section.payload as HomepageFeaturedProductsPayload;
  const patch = (partial: Partial<HomepageFeaturedProductsPayload>) => onChange({ ...section, payload: { ...payload, ...partial } });
  const selectedRefs = new Set(payload.articleRefs);

  const toggleArticle = (articleRef: string) => {
    if (selectedRefs.has(articleRef)) {
      patch({ articleRefs: payload.articleRefs.filter((ref) => ref !== articleRef) });
      return;
    }
    patch({ articleRefs: [...payload.articleRefs, articleRef] });
  };

  return (
    <SectionCard title="Produits mis en avant">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Titre"><Input value={payload.title ?? ''} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="Sous-titre"><Input value={payload.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} /></Field>
        <Field label="Mode d’affichage">
          <select className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm" value={payload.displayMode} onChange={(e) => patch({ displayMode: e.target.value as HomepageFeaturedProductsPayload['displayMode'] })}>
            <option value="grid">Grille</option>
            <option value="slider">Slider</option>
          </select>
        </Field>
        <Field label="Nombre maximum"><Input type="number" value={payload.maxItems} onChange={(e) => patch({ maxItems: Number(e.target.value) || 1 })} /></Field>
      </div>

      <Field label="Description">
        <Textarea value={payload.description ?? ''} onChange={(e) => patch({ description: e.target.value })} />
      </Field>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm font-semibold text-card-foreground"><input type="checkbox" checked={payload.showPrices} onChange={(e) => patch({ showPrices: e.target.checked })} /> Afficher le prix</label>
        <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm font-semibold text-card-foreground"><input type="checkbox" checked={payload.showBadges} onChange={(e) => patch({ showBadges: e.target.checked })} /> Afficher le badge stock</label>
      </div>

      <CtaFields label="CTA “Voir tout”" value={payload.viewAllCta} onChange={(next) => patch({ viewAllCta: next })} />

      <Field label="Message vide">
        <Input value={payload.emptyMessage ?? ''} onChange={(e) => patch({ emptyMessage: e.target.value })} />
      </Field>

      <div className="max-h-[420px] space-y-2 overflow-auto rounded-2xl border border-border/70 bg-muted/20 p-4">
        {availableArticles.map((article) => {
          const checked = selectedRefs.has(article.aR_Ref);
          return (
            <label key={article.aR_Ref} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm">
              <input type="checkbox" checked={checked} onChange={() => toggleArticle(article.aR_Ref)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-card-foreground">{article.aR_Design}</span>
                <span className="text-muted-foreground">{article.aR_Ref} • {article.aR_PrixVen.toFixed(3)} DT • {article.stockStatus}</span>
              </span>
            </label>
          );
        })}
      </div>
    </SectionCard>
  );
}

function renderPromoBannerEditor(section: HomepageSection, onChange: (next: HomepageSection) => void) {
  const payload = section.payload as HomepagePromoBannerPayload;
  const patch = (partial: Partial<HomepagePromoBannerPayload>) => onChange({ ...section, payload: { ...payload, ...partial } });

  return (
    <SectionCard title="Bannière promotionnelle">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Badge"><Input value={payload.badgeText ?? ''} onChange={(e) => patch({ badgeText: e.target.value })} /></Field>
        <Field label="Titre"><Input value={payload.title ?? ''} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="Sous-titre"><Input value={payload.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} /></Field>
      </div>
      <Field label="Description"><Textarea value={payload.description ?? ''} onChange={(e) => patch({ description: e.target.value })} /></Field>
      <CtaFields label="CTA principal" value={payload.primaryCta} onChange={(next) => patch({ primaryCta: next })} />
      <CtaFields label="CTA secondaire" value={payload.secondaryCta} onChange={(next) => patch({ secondaryCta: next })} />
      <HomepageImageField label="Image desktop" value={payload.image} onChange={(next) => patch({ image: next })} />
      <HomepageImageField label="Image mobile" value={payload.mobileImage} onChange={(next) => patch({ mobileImage: next })} />
    </SectionCard>
  );
}

function renderAudiencesEditor(section: HomepageSection, onChange: (next: HomepageSection) => void) {
  const payload = section.payload as HomepageAudiencesPayload;
  const patch = (partial: Partial<HomepageAudiencesPayload>) => onChange({ ...section, payload: { ...payload, ...partial } });

  return (
    <SectionCard title="Parcours B2B / B2C">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Titre"><Input value={payload.title ?? ''} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="Sous-titre"><Input value={payload.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} /></Field>
      </div>
      <Field label="Description"><Textarea value={payload.description ?? ''} onChange={(e) => patch({ description: e.target.value })} /></Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="space-y-4 p-5">
          <div className="text-base font-black text-card-foreground">Carte B2B</div>
          <Field label="Badge"><Input value={payload.b2B.badgeText ?? ''} onChange={(e) => patch({ b2B: { ...payload.b2B, badgeText: e.target.value } })} /></Field>
          <Field label="Titre"><Input value={payload.b2B.title ?? ''} onChange={(e) => patch({ b2B: { ...payload.b2B, title: e.target.value } })} /></Field>
          <Field label="Description"><Textarea value={payload.b2B.description ?? ''} onChange={(e) => patch({ b2B: { ...payload.b2B, description: e.target.value } })} /></Field>
          <CtaFields label="CTA B2B" value={payload.b2B.cta} onChange={(next) => patch({ b2B: { ...payload.b2B, cta: next } })} />
        </Card>

        <Card className="space-y-4 p-5">
          <div className="text-base font-black text-card-foreground">Carte B2C</div>
          <Field label="Badge"><Input value={payload.b2C.badgeText ?? ''} onChange={(e) => patch({ b2C: { ...payload.b2C, badgeText: e.target.value } })} /></Field>
          <Field label="Titre"><Input value={payload.b2C.title ?? ''} onChange={(e) => patch({ b2C: { ...payload.b2C, title: e.target.value } })} /></Field>
          <Field label="Description"><Textarea value={payload.b2C.description ?? ''} onChange={(e) => patch({ b2C: { ...payload.b2C, description: e.target.value } })} /></Field>
          <CtaFields label="CTA B2C" value={payload.b2C.cta} onChange={(next) => patch({ b2C: { ...payload.b2C, cta: next } })} />
        </Card>
      </div>
    </SectionCard>
  );
}

function renderAdvantagesEditor(section: HomepageSection, onChange: (next: HomepageSection) => void) {
  const payload = section.payload as HomepageAdvantagesPayload;
  const patch = (partial: Partial<HomepageAdvantagesPayload>) => onChange({ ...section, payload: { ...payload, ...partial } });

  return (
    <SectionCard title="Bandeau avantages / services">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Titre"><Input value={payload.title ?? ''} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="Sous-titre"><Input value={payload.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} /></Field>
      </div>
      <Field label="Description"><Textarea value={payload.description ?? ''} onChange={(e) => patch({ description: e.target.value })} /></Field>

      <div className="space-y-4">
        {payload.items.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-[0.7fr_1fr_1fr_auto]">
            <Input value={item.icon ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, icon: e.target.value } : entry) })} placeholder="Icône / emoji" />
            <Input value={item.title ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, title: e.target.value } : entry) })} placeholder="Titre" />
            <Input value={item.description ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, description: e.target.value } : entry) })} placeholder="Description" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => patch({ items: moveInArray(payload.items, item.id, -1) })} disabled={index === 0}>↑</Button>
              <Button type="button" variant="outline" onClick={() => patch({ items: moveInArray(payload.items, item.id, 1) })} disabled={index === payload.items.length - 1}>↓</Button>
              <Button type="button" variant="destructive" onClick={() => patch({ items: payload.items.filter((entry) => entry.id !== item.id).map((entry, idx) => ({ ...entry, displayOrder: idx + 1 })) })}>Supprimer</Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={() => patch({ items: [...payload.items, { id: createLocalId('adv'), title: '', description: '', icon: '✨', displayOrder: payload.items.length + 1, isActive: true }] })}>
        Ajouter un avantage
      </Button>
    </SectionCard>
  );
}

function renderCataloguesEditor(section: HomepageSection, availableCatalogues: Catalogue[], onChange: (next: HomepageSection) => void) {
  const payload = section.payload as HomepageCataloguesPayload;
  const patch = (partial: Partial<HomepageCataloguesPayload>) => onChange({ ...section, payload: { ...payload, ...partial } });
  const selected = new Set(payload.catalogueNos);

  const toggleCatalogue = (catalogueNo: number) => {
    if (selected.has(catalogueNo)) {
      patch({ catalogueNos: payload.catalogueNos.filter((item) => item !== catalogueNo) });
      return;
    }
    patch({ catalogueNos: [...payload.catalogueNos, catalogueNo] });
  };

  return (
    <SectionCard title="Catalogues / univers">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Titre"><Input value={payload.title ?? ''} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="Sous-titre"><Input value={payload.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} /></Field>
        <Field label="Mode d’affichage">
          <select className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm" value={payload.displayMode} onChange={(e) => patch({ displayMode: e.target.value as HomepageCataloguesPayload['displayMode'] })}>
            <option value="grid">Grille</option>
            <option value="slider">Slider</option>
          </select>
        </Field>
        <Field label="Nombre maximum"><Input type="number" value={payload.maxItems} onChange={(e) => patch({ maxItems: Number(e.target.value) || 1 })} /></Field>
      </div>

      <Field label="Description"><Textarea value={payload.description ?? ''} onChange={(e) => patch({ description: e.target.value })} /></Field>
      <CtaFields label="CTA “Voir tout”" value={payload.viewAllCta} onChange={(next) => patch({ viewAllCta: next })} />

      <div className="max-h-[340px] space-y-2 overflow-auto rounded-2xl border border-border/70 bg-muted/20 p-4">
        {availableCatalogues.map((catalogue) => (
          <label key={catalogue.cL_No} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm">
            <input type="checkbox" checked={selected.has(catalogue.cL_No)} onChange={() => toggleCatalogue(catalogue.cL_No)} />
            <span>
              <span className="block font-semibold text-card-foreground">{catalogue.cL_Intitule}</span>
              <span className="text-muted-foreground">{catalogue.cL_Code} • Niveau {catalogue.cL_Niveau}</span>
            </span>
          </label>
        ))}
      </div>
    </SectionCard>
  );
}

function renderBrandsEditor(section: HomepageSection, onChange: (next: HomepageSection) => void) {
  const payload = section.payload as HomepageBrandsPayload;
  const patch = (partial: Partial<HomepageBrandsPayload>) => onChange({ ...section, payload: { ...payload, ...partial } });

  return (
    <SectionCard title="Marques partenaires">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Titre"><Input value={payload.title ?? ''} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="Sous-titre"><Input value={payload.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} /></Field>
        <Field label="Mode d’affichage">
          <select className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm" value={payload.displayMode} onChange={(e) => patch({ displayMode: e.target.value as HomepageBrandsPayload['displayMode'] })}>
            <option value="grid">Grille</option>
            <option value="slider">Slider</option>
          </select>
        </Field>
        <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm font-semibold text-card-foreground"><input type="checkbox" checked={payload.autoplay} onChange={(e) => patch({ autoplay: e.target.checked })} /> Autoplay</label>
      </div>

      <div className="space-y-4">
        {payload.items.map((item, index) => (
          <div key={item.id} className="space-y-4 rounded-3xl border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-base font-black text-card-foreground">Logo #{index + 1}</div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => patch({ items: moveInArray(payload.items, item.id, -1) })} disabled={index === 0}>Monter</Button>
                <Button type="button" variant="outline" onClick={() => patch({ items: moveInArray(payload.items, item.id, 1) })} disabled={index === payload.items.length - 1}>Descendre</Button>
                <Button type="button" variant="destructive" onClick={() => patch({ items: payload.items.filter((entry) => entry.id !== item.id).map((entry, idx) => ({ ...entry, displayOrder: idx + 1 })) })}>Supprimer</Button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground"><input type="checkbox" checked={item.isActive} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, isActive: e.target.checked } : entry) })} /> Actif</label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nom de la marque"><Input value={item.label ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, label: e.target.value } : entry) })} /></Field>
              <Field label="Lien cible"><Input value={item.targetHref ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, targetHref: e.target.value } : entry) })} /></Field>
            </div>
            <HomepageImageField label="Logo" value={item.image} onChange={(next) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, image: next } : entry) })} />
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={() => patch({ items: [...payload.items, createEmptyBrandItem(payload.items.length + 1)] })}>Ajouter une marque</Button>
    </SectionCard>
  );
}

function renderStatsEditor(section: HomepageSection, onChange: (next: HomepageSection) => void) {
  const payload = section.payload as HomepageStatsPayload;
  const patch = (partial: Partial<HomepageStatsPayload>) => onChange({ ...section, payload: { ...payload, ...partial } });

  return (
    <SectionCard title="Statistiques / preuve sociale">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Titre"><Input value={payload.title ?? ''} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="Sous-titre"><Input value={payload.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} /></Field>
      </div>
      <Field label="Description"><Textarea value={payload.description ?? ''} onChange={(e) => patch({ description: e.target.value })} /></Field>

      <div className="space-y-4">
        {payload.items.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-[0.7fr_1fr_1fr_0.5fr_auto]">
            <Input value={item.value ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, value: e.target.value } : entry) })} placeholder="Valeur" />
            <Input value={item.label ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, label: e.target.value } : entry) })} placeholder="Label" />
            <Input value={item.helpText ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, helpText: e.target.value } : entry) })} placeholder="Aide" />
            <Input value={item.suffix ?? ''} onChange={(e) => patch({ items: payload.items.map((entry) => entry.id === item.id ? { ...entry, suffix: e.target.value } : entry) })} placeholder="Suffixe" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => patch({ items: moveInArray(payload.items, item.id, -1) })} disabled={index === 0}>↑</Button>
              <Button type="button" variant="outline" onClick={() => patch({ items: moveInArray(payload.items, item.id, 1) })} disabled={index === payload.items.length - 1}>↓</Button>
              <Button type="button" variant="destructive" onClick={() => patch({ items: payload.items.filter((entry) => entry.id !== item.id).map((entry, idx) => ({ ...entry, displayOrder: idx + 1 })) })}>X</Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={() => patch({ items: [...payload.items, createEmptyStatItem(payload.items.length + 1)] })}>Ajouter un KPI</Button>
    </SectionCard>
  );
}

function renderFinalCtaEditor(section: HomepageSection, onChange: (next: HomepageSection) => void) {
  const payload = section.payload as HomepageFinalCtaPayload;
  const patch = (partial: Partial<HomepageFinalCtaPayload>) => onChange({ ...section, payload: { ...payload, ...partial } });

  return (
    <SectionCard title="CTA final">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Titre"><Input value={payload.title ?? ''} onChange={(e) => patch({ title: e.target.value })} /></Field>
        <Field label="Sous-titre"><Input value={payload.subtitle ?? ''} onChange={(e) => patch({ subtitle: e.target.value })} /></Field>
      </div>
      <Field label="Description"><Textarea value={payload.description ?? ''} onChange={(e) => patch({ description: e.target.value })} /></Field>
      <CtaFields label="CTA principal" value={payload.primaryCta} onChange={(next) => patch({ primaryCta: next })} />
      <CtaFields label="CTA secondaire" value={payload.secondaryCta} onChange={(next) => patch({ secondaryCta: next })} />
      <HomepageImageField label="Image de fond desktop" value={payload.backgroundImage} onChange={(next) => patch({ backgroundImage: next })} />
      <HomepageImageField label="Image de fond mobile" value={payload.mobileBackgroundImage} onChange={(next) => patch({ mobileBackgroundImage: next })} />
    </SectionCard>
  );
}

function createEmptyBrandItem(order: number): HomepageBrandItem {
  return {
    id: createLocalId('brand'),
    label: '',
    image: { sourceType: 'url', url: '', cloudinaryPublicId: '', alt: '' },
    targetHref: '',
    displayOrder: order,
    isActive: true,
  };
}

function createEmptyStatItem(order: number): HomepageStatItem {
  return {
    id: createLocalId('stat'),
    value: '',
    label: '',
    helpText: '',
    suffix: '',
    displayOrder: order,
    isActive: true,
  };
}

function moveInArray<T extends { id: string; displayOrder: number }>(items: T[], itemId: string, direction: -1 | 1): T[] {
  const sorted = [...items].sort((a, b) => a.displayOrder - b.displayOrder);
  const currentIndex = sorted.findIndex((item) => item.id === itemId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sorted.length) return sorted;

  const next = [...sorted];
  [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
  return next.map((item, index) => ({ ...item, displayOrder: index + 1 }));
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}