import { Button } from "../../../../shared/components/Button";
import { Input } from "../../../../shared/components/Input";
import {
  type HomepageCarouselPayload,
  type HomepageCarouselSlide,
  type HomepageHeroPayload,
  type HomepageSection,
  createDefaultHomepageImage,
  createLocalId,
} from "../../types/homepage";
import {
  AdminField,
  AdminSectionShell,
  AdminTextarea,
  AdminToggle,
  CtaFieldsEditor,
  ItemToolbar,
} from "./HomepageAdminPrimitives";
import { HomepageImageField } from "./HomepageImageField";

function createSlide(order: number): HomepageCarouselSlide {
  return {
    id: createLocalId("slide"),
    badgeText: order === 1 ? "Visuel principal" : "",
    title: `Visuel ${order}`,
    subtitle: "Titre marketing",
    description: "Ajoutez ici un message fort avec un visuel et un bouton.",
    primaryCta: { text: "Découvrir", href: "/articles" },
    secondaryCta: { text: "Contacter", href: "/contact" },
    image: createDefaultHomepageImage(),
    mobileImage: createDefaultHomepageImage(),
    textAlignment: "left",
    contentPosition: "left",
    overlayOpacity: 0.28,
    reassuranceText: "",
    displayOrder: order,
    isActive: true,
    startAt: null,
    endAt: null,
  };
}

export function HomepageHeroCarouselEditor({
  section,
  onChange,
}: {
  section: HomepageSection;
  onChange: (section: HomepageSection) => void;
}) {
  if (section.type === "hero") {
    const payload = section.payload as HomepageHeroPayload;

    return (
      <div className="space-y-4">
        <AdminSectionShell
          title="Bannière principale"
          subtitle="Bloc principal de la page d’accueil, clair et commercial."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Badge">
              <Input
                value={payload.badgeText ?? ""}
                onChange={(e) => onChange({ ...section, payload: { ...payload, badgeText: e.target.value } })}
                placeholder="Nouveauté"
              />
            </AdminField>
            <AdminField label="Texte de réassurance">
              <Input
                value={payload.reassuranceText ?? ""}
                onChange={(e) => onChange({ ...section, payload: { ...payload, reassuranceText: e.target.value } })}
                placeholder="Livraison rapide • Stock visible • Support réactif"
              />
            </AdminField>
          </div>
          <AdminField label="Titre">
            <Input
              value={payload.title ?? ""}
              onChange={(e) => onChange({ ...section, payload: { ...payload, title: e.target.value } })}
            />
          </AdminField>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Sous-titre">
              <Input
                value={payload.subtitle ?? ""}
                onChange={(e) => onChange({ ...section, payload: { ...payload, subtitle: e.target.value } })}
              />
            </AdminField>
            <AdminField label="Position du contenu">
              <select
                className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                value={payload.contentPosition ?? "left"}
                onChange={(e) => onChange({ ...section, payload: { ...payload, contentPosition: e.target.value as HomepageHeroPayload["contentPosition"] } })}
              >
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
              </select>
            </AdminField>
          </div>
          <AdminField label="Description">
            <AdminTextarea
              value={payload.description ?? ""}
              onChange={(e) => onChange({ ...section, payload: { ...payload, description: e.target.value } })}
            />
          </AdminField>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AdminField label="Alignement du texte">
              <select
                className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                value={payload.textAlignment ?? "left"}
                onChange={(e) => onChange({ ...section, payload: { ...payload, textAlignment: e.target.value as HomepageHeroPayload["textAlignment"] } })}
              >
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
              </select>
            </AdminField>
            <AdminField label="Assombrissement" hint="0 à 1">
              <Input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={payload.overlayOpacity ?? 0.2}
                onChange={(e) => onChange({ ...section, payload: { ...payload, overlayOpacity: Number(e.target.value) } })}
              />
            </AdminField>
          </div>
        </AdminSectionShell>

        <HomepageImageField
          label="Image principale"
          value={payload.image}
          onChange={(image) => onChange({ ...section, payload: { ...payload, image } })}
          helperText="URL directe ou téléversement Cloudinary."
        />
        <HomepageImageField
          label="Image mobile"
          value={payload.mobileImage ?? createDefaultHomepageImage()}
          onChange={(mobileImage) => onChange({ ...section, payload: { ...payload, mobileImage } })}
          helperText="Version mobile optionnelle du hero."
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <CtaFieldsEditor
            label="Bouton principal"
            value={payload.primaryCta}
            onChange={(primaryCta) => onChange({ ...section, payload: { ...payload, primaryCta } })}
          />
          <CtaFieldsEditor
            label="Bouton secondaire"
            value={payload.secondaryCta}
            onChange={(secondaryCta) => onChange({ ...section, payload: { ...payload, secondaryCta } })}
          />
        </div>
      </div>
    );
  }

  const payload = section.payload as HomepageCarouselPayload;

  const updateSlide = (slideId: string, updater: (slide: HomepageCarouselSlide) => HomepageCarouselSlide) => {
    onChange({
      ...section,
      payload: {
        ...payload,
        slides: payload.slides
          .map((slide) => (slide.id === slideId ? updater(slide) : slide))
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((slide, index) => ({ ...slide, displayOrder: index + 1 })),
      },
    });
  };

  const moveSlide = (slideId: string, direction: -1 | 1) => {
    const currentIndex = payload.slides.findIndex((slide) => slide.id === slideId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= payload.slides.length) return;
    const next = [...payload.slides];
    [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
    onChange({
      ...section,
      payload: {
        ...payload,
        slides: next.map((slide, index) => ({ ...slide, displayOrder: index + 1 })),
      },
    });
  };

  const resizeSlides = (nextCount: number) => {
    const target = Math.min(8, Math.max(1, nextCount));
    if (target === payload.slides.length) return;

    if (target > payload.slides.length) {
      const additions = Array.from({ length: target - payload.slides.length }, (_, index) =>
        createSlide(payload.slides.length + index + 1),
      );
      onChange({
        ...section,
        payload: {
          ...payload,
          slides: [...payload.slides, ...additions],
        },
      });
      return;
    }

    onChange({
      ...section,
      payload: {
        ...payload,
        slides: payload.slides.slice(0, target).map((slide, index) => ({ ...slide, displayOrder: index + 1 })),
      },
    });
  };

  return (
    <div className="space-y-4">
      <AdminSectionShell
        title="Carrousel principal"
        subtitle="Carrousel commercial pour la première impression de la page d’accueil."
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() =>
              onChange({
                ...section,
                payload: {
                  ...payload,
                  slides: [...payload.slides, createSlide(payload.slides.length + 1)],
                },
              })
            }
          >
            Ajouter un visuel
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminField label="Titre interne du bloc">
            <Input
              value={payload.title ?? ""}
              onChange={(e) => onChange({ ...section, payload: { ...payload, title: e.target.value } })}
            />
          </AdminField>
          <AdminField label="Sous-titre interne">
            <Input
              value={payload.subtitle ?? ""}
              onChange={(e) => onChange({ ...section, payload: { ...payload, subtitle: e.target.value } })}
            />
          </AdminField>
          <AdminField label="Défilement automatique (ms)">
            <Input
              type="number"
              min="1500"
              step="100"
              value={payload.autoplayDelayMs}
              onChange={(e) => onChange({ ...section, payload: { ...payload, autoplayDelayMs: Number(e.target.value || 5000) } })}
            />
          </AdminField>
          <AdminField label="Nombre de visuels" hint="1 à 8">
            <Input
              type="number"
              min="1"
              max="8"
              value={payload.slides.length}
              onChange={(e) => resizeSlides(Number(e.target.value || 1))}
            />
          </AdminField>
        </div>
        <div className="flex flex-wrap gap-3">
          <AdminToggle
            label="Défilement automatique"
            checked={payload.autoplay}
            onChange={(autoplay) => onChange({ ...section, payload: { ...payload, autoplay } })}
          />
          <AdminToggle
            label="Afficher les points"
            checked={payload.showDots}
            onChange={(showDots) => onChange({ ...section, payload: { ...payload, showDots } })}
          />
          <AdminToggle
            label="Afficher les flèches"
            checked={payload.showArrows}
            onChange={(showArrows) => onChange({ ...section, payload: { ...payload, showArrows } })}
          />
        </div>
      </AdminSectionShell>

      <div className="space-y-4">
        {payload.slides.map((slide, index) => (
          <AdminSectionShell
            key={slide.id}
            title={`Visuel ${index + 1}`}
            subtitle="Contenu marketing éditable individuellement."
            actions={
              <ItemToolbar
                onMoveUp={() => moveSlide(slide.id, -1)}
                onMoveDown={() => moveSlide(slide.id, 1)}
                onDelete={() =>
                  onChange({
                    ...section,
                    payload: {
                      ...payload,
                      slides: payload.slides
                        .filter((entry) => entry.id !== slide.id)
                        .map((entry, slideIndex) => ({ ...entry, displayOrder: slideIndex + 1 })),
                    },
                  })
                }
                disableUp={index === 0}
                disableDown={index === payload.slides.length - 1}
              />
            }
          >
            <div className="flex flex-wrap gap-3">
              <AdminToggle
                label="Visuel actif"
                checked={slide.isActive}
                onChange={(isActive) => updateSlide(slide.id, (current) => ({ ...current, isActive }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AdminField label="Badge">
                <Input
                  value={slide.badgeText ?? ""}
                  onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, badgeText: e.target.value }))}
                />
              </AdminField>
              <AdminField label="Alignement">
                <select
                  className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                  value={slide.textAlignment ?? "left"}
                  onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, textAlignment: e.target.value as HomepageCarouselSlide["textAlignment"] }))}
                >
                  <option value="left">Gauche</option>
                  <option value="center">Centre</option>
                  <option value="right">Droite</option>
                </select>
              </AdminField>
              <AdminField label="Position contenu">
                <select
                  className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                  value={slide.contentPosition ?? "left"}
                  onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, contentPosition: e.target.value as HomepageCarouselSlide["contentPosition"] }))}
                >
                  <option value="left">Gauche</option>
                  <option value="center">Centre</option>
                  <option value="right">Droite</option>
                </select>
              </AdminField>
            </div>

            <AdminField label="Titre">
              <Input
                value={slide.title ?? ""}
                onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, title: e.target.value }))}
              />
            </AdminField>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Sous-titre">
                <Input
                  value={slide.subtitle ?? ""}
                  onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, subtitle: e.target.value }))}
                />
              </AdminField>
              <AdminField label="Texte de réassurance">
                <Input
                  value={slide.reassuranceText ?? ""}
                  onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, reassuranceText: e.target.value }))}
                />
              </AdminField>
            </div>
            <AdminField label="Description">
              <AdminTextarea
                value={slide.description ?? ""}
                onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, description: e.target.value }))}
              />
            </AdminField>
            <div className="grid gap-4 md:grid-cols-3">
              <AdminField label="Assombrissement" hint="0 à 1">
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={slide.overlayOpacity ?? 0.28}
                  onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, overlayOpacity: Number(e.target.value) }))}
                />
              </AdminField>
              <AdminField label="Début de visibilité">
                <Input
                  type="datetime-local"
                  value={slide.startAt?.slice(0, 16) ?? ""}
                  onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, startAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                />
              </AdminField>
              <AdminField label="Fin de visibilité">
                <Input
                  type="datetime-local"
                  value={slide.endAt?.slice(0, 16) ?? ""}
                  onChange={(e) => updateSlide(slide.id, (current) => ({ ...current, endAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                />
              </AdminField>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <HomepageImageField
                label="Image grand écran"
                value={slide.image}
                onChange={(image) => updateSlide(slide.id, (current) => ({ ...current, image }))}
                helperText="Téléversez dans Cloudinary ou collez une URL directe."
              />
              <HomepageImageField
                label="Image mobile"
                value={slide.mobileImage ?? createDefaultHomepageImage()}
                onChange={(mobileImage) => updateSlide(slide.id, (current) => ({ ...current, mobileImage }))}
                helperText="Optionnel pour optimiser le rendu mobile."
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <CtaFieldsEditor
                label="Bouton principal"
                value={slide.primaryCta}
                onChange={(primaryCta) => updateSlide(slide.id, (current) => ({ ...current, primaryCta }))}
              />
              <CtaFieldsEditor
                label="Bouton secondaire"
                value={slide.secondaryCta ?? {}}
                onChange={(secondaryCta) => updateSlide(slide.id, (current) => ({ ...current, secondaryCta }))}
              />
            </div>
          </AdminSectionShell>
        ))}
      </div>
    </div>
  );
}
