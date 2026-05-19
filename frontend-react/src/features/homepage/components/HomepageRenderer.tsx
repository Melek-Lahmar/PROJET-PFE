import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { SmartImage } from '../../../shared/components/SmartImage';
import type {
  HomepageAdvantagesPayload,
  HomepageAudiencesPayload,
  HomepageBrandItem,
  HomepageBrandsPayload,
  HomepageCarouselPayload,
  HomepageCarouselSlide,
  HomepageCataloguesPayload,
  HomepageCatalogueSpotlightItem,
  HomepageContactPayload,
  HomepageFeaturedCategoriesPayload,
  HomepageFeaturedCategoryItem,
  HomepageFeaturedProductsPayload,
  HomepageFinalCtaPayload,
  HomepageHeroPayload,
  HomepagePromoBannerPayload,
  HomepageResolvedStore,
  HomepageSection,
  HomepageStatsPayload,
  HomepageStoreItem,
  HomepageStoresPayload,
  HomepageView,
} from '../types/homepage';
import { getImagePreviewUrl } from '../types/homepage';

function hrefIsInternal(href?: string | null) {
  return !!href && href.startsWith('/');
}

function hrefIsTel(href?: string | null) {
  return !!href && href.startsWith('tel:');
}

function hrefIsMail(href?: string | null) {
  return !!href && href.startsWith('mailto:');
}

function formatHrefLabel(href?: string | null) {
  if (!href) return undefined;
  if (hrefIsTel(href) || hrefIsMail(href)) return href.replace(/^tel:|^mailto:/, '');
  return href;
}

function normalizePhoneHref(value?: string | null) {
  const raw = (value ?? '').trim();
  if (!raw) return undefined;
  if (raw.startsWith('tel:')) return raw;
  const normalized = raw.replace(/[^+\d]/g, '');
  return normalized ? `tel:${normalized}` : undefined;
}

function normalizeMailHref(value?: string | null) {
  const raw = (value ?? '').trim();
  if (!raw) return undefined;
  if (raw.startsWith('mailto:')) return raw;
  return `mailto:${raw}`;
}

function formatTnd(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(3);
}

function clampOverlay(value?: number | null) {
  const safe = Number(value ?? 0.28);
  if (!Number.isFinite(safe)) return 0.28;
  return Math.min(0.82, Math.max(0, safe));
}

function isWithinWindow(startAt?: string | null, endAt?: string | null) {
  const now = Date.now();
  const start = startAt ? new Date(startAt).getTime() : null;
  const end = endAt ? new Date(endAt).getTime() : null;

  if (start && !Number.isNaN(start) && now < start) return false;
  if (end && !Number.isNaN(end) && now > end) return false;
  return true;
}

function isSectionVisible(section: HomepageSection, preview: boolean) {
  if (!section.isActive) return false;
  return preview ? true : isWithinWindow(section.startAt, section.endAt);
}

function isSlideVisible(slide: HomepageCarouselSlide, preview: boolean) {
  if (!slide.isActive) return false;
  return preview ? true : isWithinWindow(slide.startAt, slide.endAt);
}

function getTextAlignClass(value?: 'left' | 'center' | 'right' | null) {
  switch (value) {
    case 'center':
      return 'text-center';
    case 'right':
      return 'text-right';
    default:
      return 'text-left';
  }
}

function getItemsJustifyClass(value?: 'left' | 'center' | 'right' | null) {
  switch (value) {
    case 'center':
      return 'items-center';
    case 'right':
      return 'items-end';
    default:
      return 'items-start';
  }
}

function getContentPositionClass(value?: 'left' | 'center' | 'right' | null) {
  switch (value) {
    case 'center':
      return 'justify-center';
    case 'right':
      return 'justify-end';
    default:
      return 'justify-start';
  }
}

function combineAddress(store: HomepageResolvedStore) {
  const parts = [store.address, store.complement, store.postalCode, store.city, store.country]
    .map((part) => (part ?? '').trim())
    .filter(Boolean);

  return parts.join(', ');
}

function catalogueCardHref(item?: { targetHref?: string | null; catalogueNo: number }) {
  return item?.targetHref?.trim() || `/articles?catalogueNo=${item?.catalogueNo}`;
}

function storeCardHref(item: HomepageStoreItem, resolved?: HomepageResolvedStore | null) {
  return item.targetHref?.trim() || (resolved ? '/contact' : undefined);
}

function ActionLink({
  href,
  children,
  variant = 'primary',
  className = '',
}: {
  href?: string | null;
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'secondary';
  className?: string;
}) {
  if (!href) return null;

  const button = (
    <Button variant={variant} className={className}>
      {children}
    </Button>
  );

  if (hrefIsInternal(href)) {
    return <Link to={href}>{button}</Link>;
  }

  return (
    <a href={href} target={hrefIsTel(href) || hrefIsMail(href) ? undefined : '_blank'} rel={hrefIsTel(href) || hrefIsMail(href) ? undefined : 'noreferrer'}>
      {button}
    </a>
  );
}

function SectionTitle({
  title,
  subtitle,
  description,
  align = 'center',
  rightSlot,
}: {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  align?: 'center' | 'left';
  rightSlot?: React.ReactNode;
}) {
  if (align === 'left') {
    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          {subtitle ? <div className="app-kicker">{subtitle}</div> : null}
          {title ? <h2 className="text-2xl font-black tracking-tight text-card-foreground md:text-4xl">{title}</h2> : null}
          {description ? <p className="app-description text-base md:text-[15px]">{description}</p> : null}
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3 text-center">
      {subtitle ? <div className="app-kicker">{subtitle}</div> : null}
      {title ? <h2 className="text-2xl font-black tracking-tight text-card-foreground md:text-4xl">{title}</h2> : null}
      {description ? <p className="app-description text-base md:text-[15px]">{description}</p> : null}
      {rightSlot ? <div className="pt-2">{rightSlot}</div> : null}
    </div>
  );
}

function StockBadgePill({ status }: { status?: string | null }) {
  const normalized = (status ?? '').toUpperCase();

  const label =
    normalized === 'IN_STOCK'
      ? 'En stock'
      : normalized === 'LOW_STOCK'
        ? 'Stock faible'
        : normalized === 'NOT_TRACKED'
          ? 'Disponibilité non suivie'
          : 'Rupture';

  const tone =
    normalized === 'IN_STOCK'
      ? 'badge-success'
      : normalized === 'LOW_STOCK'
        ? 'badge-warning'
        : normalized === 'NOT_TRACKED'
          ? 'badge-neutral'
          : 'badge-danger';

  return <span className={`${tone} inline-flex rounded-full px-3 py-1 text-xs font-semibold`}>{label}</span>;
}

function ContactMiniCard({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | null;
  href?: string | null;
}) {
  if (!value?.trim()) return null;

  return (
    <div className="rounded-[26px] border border-border/70 bg-card/88 p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.34)]">
      <div className="app-kicker">{label}</div>
      {href ? (
        <a
          href={href}
          className="mt-3 block text-base font-bold text-card-foreground transition-colors hover:text-primary"
          target={hrefIsTel(href) || hrefIsMail(href) ? undefined : '_blank'}
          rel={hrefIsTel(href) || hrefIsMail(href) ? undefined : 'noreferrer'}
        >
          {value}
        </a>
      ) : (
        <div className="mt-3 text-base font-bold text-card-foreground">{value}</div>
      )}
    </div>
  );
}

function HomepageCarouselSection({
  section,
  payload,
  preview,
}: {
  section: HomepageSection;
  payload: HomepageCarouselPayload;
  preview: boolean;
}) {
  const slides = useMemo(
    () => [...(payload.slides ?? [])].filter((slide) => isSlideVisible(slide, preview)).sort((a, b) => a.displayOrder - b.displayOrder),
    [payload.slides, preview],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length, section.id]);

  useEffect(() => {
    if (slides.length <= 1 || !payload.autoplay || preview) return;
    const delay = Math.max(2500, Number(payload.autoplayDelayMs || 5000));
    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, delay);
    return () => window.clearInterval(id);
  }, [slides.length, payload.autoplay, payload.autoplayDelayMs, preview]);

  if (!slides.length) return null;

  const safeIndex = activeIndex >= slides.length ? 0 : activeIndex;
  const activeSlide = slides[safeIndex];
  const overlayOpacity = clampOverlay(activeSlide.overlayOpacity);
  const textAlignmentClass = getTextAlignClass(activeSlide.textAlignment);
  const itemAlignmentClass = getItemsJustifyClass(activeSlide.textAlignment);
  const contentPositionClass = getContentPositionClass(activeSlide.contentPosition);
  const imageSrc = getImagePreviewUrl(activeSlide.image);

  return (
    <section key={section.id} className="app-surface relative overflow-hidden p-0">
      <div className="relative min-h-[520px] lg:min-h-[620px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.22),_transparent_36%),radial-gradient(circle_at_bottom_right,_hsl(var(--info)/0.16),_transparent_28%)]" />
        <div className="absolute inset-0">
          <SmartImage
            src={imageSrc}
            alt={activeSlide.image?.alt ?? activeSlide.title ?? 'Carousel homepage'}
            className="h-full w-full"
            fit="cover"
            loading="eager"
            placeholderClassName="flex h-full min-h-[520px] items-center justify-center bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--card)),hsl(var(--info)/0.08))] text-center text-muted-foreground"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,11,24,0.82),rgba(7,11,24,0.38)_48%,rgba(7,11,24,0.16))]" style={{ opacity: Math.max(0.42, overlayOpacity + 0.28) }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_left_center,rgba(255,255,255,0.14),transparent_34%)]" />

        <div className={`relative z-10 flex min-h-[520px] px-6 py-8 md:px-10 lg:min-h-[620px] lg:px-14 ${contentPositionClass}`}>
          <div className={`flex w-full max-w-2xl flex-col justify-center gap-6 ${itemAlignmentClass} ${textAlignmentClass}`}>
            <div className="space-y-4">
              {payload.subtitle ? <div className="app-kicker text-white/70">{payload.subtitle}</div> : null}
              {activeSlide.badgeText ? (
                <div className="inline-flex rounded-full border border-white/20 bg-white/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-[0_14px_28px_-20px_rgba(255,255,255,0.5)] backdrop-blur-sm">
                  {activeSlide.badgeText}
                </div>
              ) : null}
              {activeSlide.title ? <h1 className="text-balance text-4xl font-black tracking-tight text-white md:text-6xl xl:text-7xl">{activeSlide.title}</h1> : null}
              {activeSlide.subtitle ? <p className="text-lg font-semibold text-white/88 md:text-2xl">{activeSlide.subtitle}</p> : null}
              {activeSlide.description ? <p className="max-w-2xl text-sm leading-7 text-white/74 md:text-base">{activeSlide.description}</p> : null}
            </div>

            <div className={`flex flex-wrap gap-3 ${textAlignmentClass === 'text-center' ? 'justify-center' : textAlignmentClass === 'text-right' ? 'justify-end' : 'justify-start'}`}>
              <ActionLink href={activeSlide.primaryCta?.href} className="h-12 px-6 text-base">
                {activeSlide.primaryCta?.text ?? 'Découvrir'}
              </ActionLink>
              {activeSlide.secondaryCta?.href ? (
                <ActionLink href={activeSlide.secondaryCta?.href} variant="outline" className="h-12 border-white/20 bg-white/10 px-6 text-base text-white hover:bg-white/16 hover:text-white">
                  {activeSlide.secondaryCta?.text ?? 'En savoir plus'}
                </ActionLink>
              ) : null}
            </div>

            {activeSlide.reassuranceText ? (
              <div className="inline-flex max-w-full rounded-[24px] border border-white/14 bg-white/10 px-4 py-3 text-sm font-semibold text-white/84 shadow-[0_18px_36px_-28px_rgba(2,6,23,0.76)] backdrop-blur-sm">
                {activeSlide.reassuranceText}
              </div>
            ) : null}
          </div>
        </div>

        {slides.length > 1 && payload.showArrows ? (
          <>
            <button
              type="button"
              onClick={() => setActiveIndex((current) => (current - 1 + slides.length) % slides.length)}
              className="absolute left-5 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-white/10 text-2xl text-white shadow-[0_18px_40px_-28px_rgba(2,6,23,0.72)] backdrop-blur-sm transition hover:bg-white/16"
              aria-label="Slide précédent"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((current) => (current + 1) % slides.length)}
              className="absolute right-5 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-white/10 text-2xl text-white shadow-[0_18px_40px_-28px_rgba(2,6,23,0.72)] backdrop-blur-sm transition hover:bg-white/16"
              aria-label="Slide suivant"
            >
              ›
            </button>
          </>
        ) : null}

        {slides.length > 1 && payload.showDots ? (
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 backdrop-blur-sm">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${index === safeIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/36 hover:bg-white/58'}`}
                aria-label={`Aller au slide ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function renderHero(section: HomepageSection, _preview: boolean, _isPublished: boolean) {
  const payload = section.payload as HomepageHeroPayload;
  const imageSrc = getImagePreviewUrl(payload.image);
  const textAlignmentClass = getTextAlignClass(payload.textAlignment);
  const itemAlignmentClass = getItemsJustifyClass(payload.textAlignment);
  const contentPositionClass = getContentPositionClass(payload.contentPosition);
  const overlayOpacity = clampOverlay(payload.overlayOpacity);

  return (
    <section key={section.id} className="app-surface relative overflow-hidden p-0">
      <div className="relative min-h-[420px] lg:min-h-[520px]">
        <div className="absolute inset-0">
          <SmartImage
            src={imageSrc}
            alt={payload.image?.alt ?? payload.title ?? 'Hero homepage'}
            className="h-full w-full"
            fit="cover"
            loading="eager"
            placeholderClassName="flex h-full min-h-[420px] items-center justify-center bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--card)),hsl(var(--info)/0.08))] text-center text-muted-foreground"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,11,24,0.80),rgba(7,11,24,0.34)_55%,rgba(7,11,24,0.14))]" style={{ opacity: Math.max(0.46, overlayOpacity + 0.24) }} />

        <div className={`relative z-10 flex min-h-[420px] px-6 py-8 md:px-10 lg:min-h-[520px] lg:px-14 ${contentPositionClass}`}>
          <div className={`flex w-full max-w-2xl flex-col justify-center gap-5 ${itemAlignmentClass} ${textAlignmentClass}`}>
            {payload.badgeText ? (
              <div className="inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                {payload.badgeText}
              </div>
            ) : null}

            {payload.title ? <h1 className="text-balance text-4xl font-black tracking-tight text-white md:text-6xl">{payload.title}</h1> : null}
            {payload.subtitle ? <p className="text-lg font-semibold text-white/86 md:text-2xl">{payload.subtitle}</p> : null}
            {payload.description ? <p className="max-w-2xl text-sm leading-7 text-white/74 md:text-base">{payload.description}</p> : null}

            <div className={`flex flex-wrap gap-3 ${textAlignmentClass === 'text-center' ? 'justify-center' : textAlignmentClass === 'text-right' ? 'justify-end' : 'justify-start'}`}>
              <ActionLink href={payload.primaryCta?.href} className="h-12 px-6 text-base">
                {payload.primaryCta?.text ?? 'Voir'}
              </ActionLink>
              {payload.secondaryCta?.href ? (
                <ActionLink href={payload.secondaryCta?.href} variant="outline" className="h-12 border-white/20 bg-white/10 px-6 text-base text-white hover:bg-white/16 hover:text-white">
                  {payload.secondaryCta?.text ?? 'En savoir plus'}
                </ActionLink>
              ) : null}
            </div>

            {payload.reassuranceText ? (
              <div className="inline-flex max-w-full rounded-[24px] border border-white/14 bg-white/10 px-4 py-3 text-sm font-semibold text-white/84 backdrop-blur-sm">
                {payload.reassuranceText}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function renderFeaturedCategories(section: HomepageSection) {
  const payload = section.payload as HomepageFeaturedCategoriesPayload;
  const items = (payload.items ?? [])
    .filter((item) => item.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, payload.maxItems);
  if (!items.length) return null;

  return (
    <section key={section.id} className="space-y-8">
      <SectionTitle title={payload.title} subtitle={payload.subtitle} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => renderCategoryCard(item))}
      </div>
    </section>
  );
}

function renderCategoryCard(item: HomepageFeaturedCategoryItem) {
  const label = item.label || item.resolvedCatalogue?.title || `Catalogue ${item.catalogueNo}`;
  const href = item.targetHref || `/articles?catalogueNo=${item.catalogueNo}`;

  return (
    <Card key={item.id} className="group overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-[0_34px_70px_-42px_rgba(15,23,42,0.42)]">
      <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),hsl(var(--card)),hsl(var(--info)/0.08))]">
        <SmartImage
          src={getImagePreviewUrl(item.image)}
          alt={item.image?.alt ?? label}
          className="h-full w-full transition duration-500 group-hover:scale-[1.04]"
          fit="cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(7,11,24,0.44))]" />
      </div>
      <div className="space-y-3 p-5">
        <div className="app-kicker">Catalogue #{item.catalogueNo}</div>
        <div className="text-lg font-black text-card-foreground">{label}</div>
        {item.description ? <p className="app-description line-clamp-3">{item.description}</p> : null}
        <ActionLink href={href} variant="outline" className="w-full">
          Explorer
        </ActionLink>
      </div>
    </Card>
  );
}

function renderFeaturedProducts(section: HomepageSection) {
  const payload = section.payload as HomepageFeaturedProductsPayload;
  const products = (payload.resolvedProducts ?? []).slice(0, payload.maxItems);

  return (
    <section key={section.id} className="space-y-8">
      <SectionTitle
        title={payload.title}
        subtitle={payload.subtitle}
        description={payload.description}
        align="left"
        rightSlot={
          payload.viewAllCta?.href ? (
            <ActionLink href={payload.viewAllCta.href} variant="outline">
              {payload.viewAllCta.text ?? 'Voir tout le catalogue'}
            </ActionLink>
          ) : null
        }
      />

      {products.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">{payload.emptyMessage ?? 'Aucun produit mis en avant.'}</Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {products.map((item) => (
            <Card key={item.articleRef} className="group overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-[0_34px_70px_-42px_rgba(15,23,42,0.42)]">
              <Link to={`/articles/${encodeURIComponent(item.articleRef)}`} className="block">
                <div className="relative h-64 overflow-hidden bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),hsl(var(--card)),hsl(var(--info)/0.08))]">
                  <SmartImage
                    src={item.imageUrl}
                    alt={item.designation}
                    className="h-full w-full transition duration-500 group-hover:scale-[1.04]"
                    fit="contain"
                  />
                  <div className="absolute left-4 top-4">
                    {payload.showBadges ? <StockBadgePill status={item.stockStatus} /> : null}
                  </div>
                </div>
              </Link>

              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="app-kicker">Réf. {item.articleRef}</div>
                  {item.isSleeping ? <span className="badge-warning inline-flex rounded-full px-3 py-1 text-xs font-semibold">Veille</span> : null}
                </div>
                <Link to={`/articles/${encodeURIComponent(item.articleRef)}`} className="block">
                  <div className="line-clamp-2 min-h-[3.2rem] text-lg font-black text-card-foreground transition-colors group-hover:text-primary">
                    {item.designation}
                  </div>
                </Link>
                <div className="flex items-end justify-between gap-3 border-t border-border/60 pt-4">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Prix</div>
                    <div className="text-2xl font-black tracking-tight text-card-foreground">
                      {formatTnd(item.price)} <span className="text-xs font-semibold text-muted-foreground">TND</span>
                    </div>
                  </div>
                  <Link to={`/articles/${encodeURIComponent(item.articleRef)}`}>
                    <Button variant="outline">Voir le détail</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function resolveCatalogueSpotlights(payload: HomepageCataloguesPayload) {
  const orderedItems = [...(payload.items ?? [])]
    .filter((item) => item.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (orderedItems.length > 0) {
    return orderedItems.slice(0, payload.maxItems);
  }

  return (payload.resolvedCatalogues ?? []).slice(0, payload.maxItems).map((catalogue, index) => ({
    id: `catalogue-${catalogue.catalogueNo}`,
    catalogueNo: catalogue.catalogueNo,
    label: catalogue.title,
    description: null,
    badgeText: index === 0 ? 'À explorer' : '',
    image: undefined,
    targetHref: `/articles?catalogueNo=${catalogue.catalogueNo}`,
    displayOrder: index + 1,
    isActive: true,
    resolvedCatalogue: catalogue,
  } satisfies HomepageCatalogueSpotlightItem));
}

function renderCatalogues(section: HomepageSection) {
  const payload = section.payload as HomepageCataloguesPayload;
  const cards = resolveCatalogueSpotlights(payload);
  if (!cards.length) return null;

  return (
    <section key={section.id} className="space-y-8">
      <SectionTitle
        title={payload.title}
        subtitle={payload.subtitle}
        description={payload.description}
        align="left"
        rightSlot={
          payload.viewAllCta?.href ? (
            <ActionLink href={payload.viewAllCta.href} variant="outline">
              {payload.viewAllCta.text ?? 'Voir tous les catalogues'}
            </ActionLink>
          ) : null
        }
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => {
          const label = item.label || item.resolvedCatalogue?.title || `Catalogue ${item.catalogueNo}`;
          const meta = item.resolvedCatalogue;
          return (
            <Card key={item.id} className="group overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-[0_34px_70px_-42px_rgba(15,23,42,0.42)]">
              <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),hsl(var(--card)),hsl(var(--info)/0.08))]">
                <SmartImage
                  src={getImagePreviewUrl(item.image)}
                  alt={item.image?.alt ?? label}
                  className="h-full w-full transition duration-500 group-hover:scale-[1.04]"
                  fit="cover"
                  placeholderClassName="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),_transparent_50%)] text-card-foreground"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(7,11,24,0.48))]" />
                {item.badgeText ? (
                  <div className="absolute left-4 top-4 inline-flex rounded-full border border-white/18 bg-white/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                    {item.badgeText}
                  </div>
                ) : null}
              </div>
              <div className="space-y-4 p-5">
                <div className="space-y-2">
                  <div className="app-kicker">Catalogue #{item.catalogueNo}</div>
                  <div className="text-lg font-black text-card-foreground">{label}</div>
                  {item.description ? <p className="app-description line-clamp-3">{item.description}</p> : null}
                </div>
                {meta ? (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted/50 px-3 py-1 font-semibold">Code : {meta.code}</span>
                    <span className="rounded-full bg-muted/50 px-3 py-1 font-semibold">Niveau {meta.level}</span>
                  </div>
                ) : null}
                <ActionLink href={catalogueCardHref(item)} variant="outline" className="w-full">
                  Explorer cette sélection
                </ActionLink>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function renderPromoBanner(section: HomepageSection) {
  const payload = section.payload as HomepagePromoBannerPayload;
  return (
    <section key={section.id} className="app-surface overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="space-y-5 p-7 md:p-10">
          {payload.badgeText ? <div className="app-kicker">{payload.badgeText}</div> : null}
          {payload.title ? <div className="text-3xl font-black text-card-foreground md:text-4xl">{payload.title}</div> : null}
          {payload.subtitle ? <div className="text-lg font-semibold text-card-foreground/85">{payload.subtitle}</div> : null}
          {payload.description ? <p className="app-description text-base">{payload.description}</p> : null}
          <div className="flex flex-wrap gap-3">
            <ActionLink href={payload.primaryCta?.href}>{payload.primaryCta?.text ?? 'Découvrir'}</ActionLink>
            <ActionLink href={payload.secondaryCta?.href} variant="outline">{payload.secondaryCta?.text ?? 'Contact'}</ActionLink>
          </div>
        </div>
        <div className="min-h-[280px] overflow-hidden bg-muted/20">
          <SmartImage src={getImagePreviewUrl(payload.image)} alt={payload.image?.alt ?? payload.title ?? 'Promotion'} className="h-full w-full" fit="cover" />
        </div>
      </div>
    </section>
  );
}

function renderAudiences(section: HomepageSection) {
  const payload = section.payload as HomepageAudiencesPayload;
  const cards = [payload.b2B, payload.b2C];

  return (
    <section key={section.id} className="space-y-8">
      <SectionTitle title={payload.title} subtitle={payload.subtitle} description={payload.description} />
      <div className="grid gap-5 md:grid-cols-2">
        {cards.map((card, index) => (
          <Card key={`${section.id}-audience-${index}`} className="space-y-5 p-6 transition hover:-translate-y-1 hover:shadow-[0_34px_70px_-42px_rgba(15,23,42,0.42)]">
            {card.badgeText ? <div className="app-kicker">{card.badgeText}</div> : null}
            <div className="text-2xl font-black text-card-foreground">{card.title}</div>
            {card.description ? <p className="app-description text-base">{card.description}</p> : null}
            <ActionLink href={card.cta?.href}>{card.cta?.text ?? 'Voir'}</ActionLink>
          </Card>
        ))}
      </div>
    </section>
  );
}

function renderAdvantages(section: HomepageSection) {
  const payload = section.payload as HomepageAdvantagesPayload;
  const items = [...(payload.items ?? [])].filter((item) => item.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  if (!items.length) return null;

  return (
    <section key={section.id} className="space-y-8">
      <SectionTitle title={payload.title} subtitle={payload.subtitle} description={payload.description} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="space-y-4 p-6 transition hover:-translate-y-1 hover:shadow-[0_34px_70px_-42px_rgba(15,23,42,0.42)]">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-[22px] bg-primary/10 text-2xl shadow-sm ring-1 ring-primary/10">{item.icon || '✨'}</div>
            <div className="text-xl font-black text-card-foreground">{item.title}</div>
            {item.description ? <p className="app-description">{item.description}</p> : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

function renderBrands(section: HomepageSection) {
  const payload = section.payload as HomepageBrandsPayload;
  const items = [...(payload.items ?? [])].filter((item) => item.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  if (!items.length) return null;

  return (
    <section key={section.id} className="space-y-8">
      <SectionTitle title={payload.title} subtitle={payload.subtitle} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => renderBrandCard(item))}
      </div>
    </section>
  );
}

function renderBrandCard(item: HomepageBrandItem) {
  const content = (
    <Card key={item.id} className="flex min-h-[120px] h-full items-center justify-center p-5 transition hover:-translate-y-1 hover:shadow-[0_34px_70px_-42px_rgba(15,23,42,0.42)]">
      <SmartImage
        src={getImagePreviewUrl(item.image)}
        alt={item.image?.alt ?? item.label ?? 'Marque'}
        className="h-16 w-full"
        fit="contain"
      />
    </Card>
  );

  if (item.targetHref) {
    return hrefIsInternal(item.targetHref) ? (
      <Link key={item.id} to={item.targetHref}>{content}</Link>
    ) : (
      <a key={item.id} href={item.targetHref} target="_blank" rel="noreferrer">{content}</a>
    );
  }

  return content;
}

function renderStats(section: HomepageSection) {
  const payload = section.payload as HomepageStatsPayload;
  const items = [...(payload.items ?? [])].filter((item) => item.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  if (!items.length) return null;

  return (
    <section key={section.id} className="space-y-8">
      <SectionTitle title={payload.title} subtitle={payload.subtitle} description={payload.description} />
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="space-y-3 p-6 text-center transition hover:-translate-y-1 hover:shadow-[0_34px_70px_-42px_rgba(15,23,42,0.42)]">
            <div className="text-4xl font-black text-primary">{item.value}{item.suffix ?? ''}</div>
            <div className="text-lg font-semibold text-card-foreground">{item.label}</div>
            {item.helpText ? <p className="app-description">{item.helpText}</p> : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

function renderContact(section: HomepageSection) {
  const payload = section.payload as HomepageContactPayload;
  const phoneHref = normalizePhoneHref(payload.phone);
  const emailHref = normalizeMailHref(payload.email);
  const hours = (payload.hours ?? []).map((entry) => entry.trim()).filter(Boolean);

  return (
    <section key={section.id} className="app-surface overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative overflow-hidden border-b border-border/60 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),hsl(var(--card)),hsl(var(--info)/0.08))] p-7 md:p-10 lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_44%)]" />
          <div className="relative space-y-5">
            {payload.subtitle ? <div className="app-kicker">{payload.subtitle}</div> : null}
            {payload.title ? <h2 className="text-3xl font-black tracking-tight text-card-foreground md:text-4xl">{payload.title}</h2> : null}
            {payload.description ? <p className="app-description max-w-xl text-base">{payload.description}</p> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <ContactMiniCard label={payload.phoneLabel || 'Téléphone'} value={payload.phone} href={phoneHref} />
              <ContactMiniCard label={payload.emailLabel || 'Email'} value={payload.email} href={emailHref} />
              <ContactMiniCard label={payload.addressLabel || 'Adresse'} value={payload.address} />
              {hours.length > 0 ? (
                <div className="rounded-[26px] border border-border/70 bg-card/88 p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.34)]">
                  <div className="app-kicker">{payload.hoursTitle || 'Horaires'}</div>
                  <div className="mt-3 space-y-2 text-sm font-medium text-card-foreground">
                    {hours.map((line, index) => (
                      <div key={`${section.id}-hours-${index}`}>{line}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-5 p-7 md:p-10">
          <div className="space-y-3">
            <div className="app-kicker">Canaux recommandés</div>
            <div className="text-2xl font-black text-card-foreground">Une section utile, claire et rassurante</div>
            <p className="app-description text-base">
              Guide l’utilisateur vers le bon canal de contact, renforce la confiance et facilite la prise de décision avant commande.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[26px] border border-border/70 bg-muted/22 p-5">
              <div className="app-kicker">Réponse</div>
              <div className="mt-2 text-lg font-black text-card-foreground">Accompagnement commercial</div>
              <p className="mt-2 app-description">Mettez en avant votre disponibilité pour le suivi avant et après commande.</p>
            </div>
            <div className="rounded-[26px] border border-border/70 bg-muted/22 p-5">
              <div className="app-kicker">Confiance</div>
              <div className="mt-2 text-lg font-black text-card-foreground">Coordonnées visibles</div>
              <p className="mt-2 app-description">Une homepage premium rassure quand les moyens de contact sont directs et lisibles.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionLink href={payload.primaryCta?.href} className="h-12 px-6 text-base">
              {payload.primaryCta?.text ?? 'Nous contacter'}
            </ActionLink>
            {payload.secondaryCta?.href ? (
              <ActionLink href={payload.secondaryCta?.href} variant="outline" className="h-12 px-6 text-base">
                {payload.secondaryCta?.text ?? 'Voir le catalogue'}
              </ActionLink>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function resolveStoreCards(payload: HomepageStoresPayload) {
  return [...(payload.items ?? [])]
    .filter((item) => item.isActive && item.resolvedStore)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, payload.maxItems);
}

function renderStores(section: HomepageSection) {
  const payload = section.payload as HomepageStoresPayload;
  const items = resolveStoreCards(payload);
  if (!items.length) return null;

  return (
    <section key={section.id} className="space-y-8">
      <SectionTitle
        title={payload.title}
        subtitle={payload.subtitle}
        description={payload.description}
        align="left"
        rightSlot={
          payload.viewAllCta?.href ? (
            <ActionLink href={payload.viewAllCta.href} variant="outline">
              {payload.viewAllCta.text ?? 'En savoir plus'}
            </ActionLink>
          ) : null
        }
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const store = item.resolvedStore as HomepageResolvedStore;
          const address = combineAddress(store);
          const title = item.label?.trim() || store.title;

          return (
            <Card key={item.id} className="space-y-5 p-6 transition hover:-translate-y-1 hover:shadow-[0_34px_70px_-42px_rgba(15,23,42,0.42)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="app-kicker">Dépôt #{store.depotNo}</div>
                  <div className="mt-1 text-xl font-black text-card-foreground">{title}</div>
                </div>
                {store.isPrimary ? <span className="badge-info inline-flex rounded-full px-3 py-1 text-xs font-semibold">Principal</span> : null}
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl bg-muted/35 px-4 py-3 font-semibold text-card-foreground">Code : {store.code}</div>
                {address ? <div>{address}</div> : null}
                {item.description ? <p className="app-description">{item.description}</p> : null}
              </div>

              <ActionLink href={storeCardHref(item, store)} variant="outline" className="w-full">
                {formatHrefLabel(storeCardHref(item, store))?.startsWith('/contact') ? 'Voir le contact' : 'Découvrir'}
              </ActionLink>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function renderFinalCta(section: HomepageSection) {
  const payload = section.payload as HomepageFinalCtaPayload;
  return (
    <section key={section.id} className="app-surface overflow-hidden p-0">
      <div className="relative px-6 py-10 md:px-10 md:py-14">
        {getImagePreviewUrl(payload.backgroundImage) ? (
          <div className="absolute inset-0 opacity-15">
            <SmartImage src={getImagePreviewUrl(payload.backgroundImage)} alt={payload.backgroundImage?.alt ?? payload.title ?? 'Final CTA'} className="h-full w-full" fit="cover" />
          </div>
        ) : null}

        <div className="relative mx-auto max-w-3xl space-y-4 text-center">
          {payload.subtitle ? <div className="app-kicker">{payload.subtitle}</div> : null}
          {payload.title ? <h2 className="text-3xl font-black tracking-tight text-card-foreground md:text-4xl">{payload.title}</h2> : null}
          {payload.description ? <p className="app-description text-base">{payload.description}</p> : null}
          <div className="flex flex-wrap justify-center gap-3">
            <ActionLink href={payload.primaryCta?.href}>{payload.primaryCta?.text ?? 'Voir'}</ActionLink>
            <ActionLink href={payload.secondaryCta?.href} variant="outline">{payload.secondaryCta?.text ?? 'Contact'}</ActionLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function renderSection(section: HomepageSection, preview: boolean, isPublished: boolean) {
  if (!isSectionVisible(section, preview)) return null;

  switch (section.type) {
    case 'hero':
      return renderHero(section, preview, isPublished);
    case 'carousel':
      return <HomepageCarouselSection key={section.id} section={section} payload={section.payload as HomepageCarouselPayload} preview={preview} />;
    case 'featuredCategories':
      return renderFeaturedCategories(section);
    case 'featuredProducts':
      return renderFeaturedProducts(section);
    case 'promoBanner':
      return renderPromoBanner(section);
    case 'audiences':
      return renderAudiences(section);
    case 'advantages':
      return renderAdvantages(section);
    case 'catalogues':
      return renderCatalogues(section);
    case 'brands':
      return renderBrands(section);
    case 'contact':
      return renderContact(section);
    case 'stores':
      return renderStores(section);
    case 'stats':
      return renderStats(section);
    case 'finalCta':
      return renderFinalCta(section);
    default:
      return null;
  }
}

export function HomepageRenderer({ view, preview = false }: { view: HomepageView; preview?: boolean }) {
  const sections = [...(view.content.sections ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  return <div className="space-y-10 md:space-y-14">{sections.map((section) => renderSection(section, preview, view.isPublished))}</div>;
}