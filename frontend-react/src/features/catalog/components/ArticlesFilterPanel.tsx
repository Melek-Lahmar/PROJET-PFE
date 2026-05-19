import type { Dispatch, SetStateAction } from "react";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import type { DepotDto } from "../api/depotsApi";
import type { ArticleSortBy, SortDirection } from "../types/article";
import type { CatalogueNode } from "../types/catalogue";

type FormFilters = {
  search: string;
  minPrice: string;
  maxPrice: string;
  stockStatus: string;
  catalogueNo: string;
  depotNos: string[];
  sortBy: ArticleSortBy;
  sortDirection: SortDirection;
};

type FilterMetadata = {
  count: number;
  minPrice: number | null;
  maxPrice: number | null;
};

type Props = {
  filters: FormFilters;
  setFilters: Dispatch<SetStateAction<FormFilters>>;
  roots: CatalogueNode[];
  depots: DepotDto[];
  metadata?: FilterMetadata;
  metadataLoading?: boolean;
  activeFilterCount: number;
  onApply: () => void;
  onReset: () => void;
  onClose?: () => void;
};

function formatTnd(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(3);
}

function toSafeNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeStepValue(value: number) {
  return Math.round(value * 1000) / 1000;
}

function CatalogueTreeNode({
  node,
  depth,
  selectedCatalogueNo,
  onSelect,
}: {
  node: CatalogueNode;
  depth: number;
  selectedCatalogueNo: string;
  onSelect: (value: string) => void;
}) {
  const selected = selectedCatalogueNo === String(node.cL_No);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onSelect(selected ? "" : String(node.cL_No))}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
          selected
            ? "border-primary/35 bg-primary/10 text-primary shadow-sm"
            : "border-border/70 bg-card text-card-foreground hover:border-primary/25 hover:bg-accent/45"
        }`}
        style={{ marginLeft: depth === 0 ? 0 : depth * 10 }}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{node.cL_Intitule}</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">N{node.cL_Niveau}</span>
      </button>

      {node.children.length > 0 ? (
        <div className="space-y-2 border-l border-border/60 pl-2.5">
          {node.children.map((child) => (
            <CatalogueTreeNode
              key={child.cL_No}
              node={child}
              depth={depth + 1}
              selectedCatalogueNo={selectedCatalogueNo}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ArticlesFilterPanel({
  filters,
  setFilters,
  roots,
  depots,
  metadata,
  metadataLoading = false,
  activeFilterCount,
  onApply,
  onReset,
  onClose,
}: Props) {
  const minBound = metadata?.minPrice ?? 0;
  const maxBound = metadata?.maxPrice ?? 0;
  const hasPriceBounds = metadata?.minPrice != null && metadata?.maxPrice != null && maxBound >= minBound;
  const effectiveMaxBound = hasPriceBounds && maxBound === minBound ? maxBound + 1 : maxBound;

  const currentMin = hasPriceBounds
    ? clamp(toSafeNumber(filters.minPrice, minBound), minBound, effectiveMaxBound)
    : 0;

  const currentMax = hasPriceBounds
    ? clamp(toSafeNumber(filters.maxPrice, effectiveMaxBound), minBound, effectiveMaxBound)
    : 0;

  const leftPercent = hasPriceBounds ? ((currentMin - minBound) / (effectiveMaxBound - minBound)) * 100 : 0;
  const rightPercent = hasPriceBounds ? ((currentMax - minBound) / (effectiveMaxBound - minBound)) * 100 : 100;

  const setSelectedDepot = (depotNo: string, checked: boolean) => {
    setFilters((prev) => {
      const next = new Set(prev.depotNos);
      if (checked) next.add(depotNo);
      else next.delete(depotNo);

      return {
        ...prev,
        depotNos: Array.from(next).sort((a, b) => Number(a) - Number(b)),
      };
    });
  };

  const setPriceFromSlider = (key: "minPrice" | "maxPrice", value: number) => {
    if (!hasPriceBounds) return;

    setFilters((prev) => {
      const prevMin = clamp(toSafeNumber(prev.minPrice, minBound), minBound, effectiveMaxBound);
      const prevMax = clamp(toSafeNumber(prev.maxPrice, effectiveMaxBound), minBound, effectiveMaxBound);
      const nextValue = normalizeStepValue(value);

      if (key === "minPrice") {
        const nextMin = Math.min(nextValue, prevMax);
        return { ...prev, minPrice: String(nextMin) };
      }

      const nextMax = Math.max(nextValue, prevMin);
      return { ...prev, maxPrice: String(nextMax) };
    });
  };

  const stockOptions = [
    { value: "", label: "Toutes" },
    { value: "IN_STOCK", label: "En stock" },
    { value: "LOW_STOCK", label: "Stock faible" },
    { value: "OUT_OF_STOCK", label: "Rupture" },
    { value: "NOT_TRACKED", label: "Non suivi" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[30px] border border-border/70 bg-card/95 text-card-foreground shadow-[0_26px_70px_-42px_rgba(15,23,42,0.46)] backdrop-blur-xl">
      <div className="border-b border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.65),rgba(255,255,255,0.18))] px-5 py-5 md:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="app-kicker">Filtres catalogue</div>
            <div className="mt-1 text-lg font-black text-card-foreground">Navigation intelligente</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {activeFilterCount} filtre{activeFilterCount > 1 ? "s" : ""} actif{activeFilterCount > 1 ? "s" : ""} • interface premium sans casser la logique API
            </div>
          </div>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--input))] text-lg text-card-foreground shadow-sm transition hover:border-primary/20 hover:bg-card"
              aria-label="Fermer les filtres"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-card-foreground">Recherche</div>
            {filters.search.trim() ? (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Active
              </span>
            ) : null}
          </div>

          <Input
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Référence, désignation, code barre..."
          />

          <div className="text-xs text-muted-foreground">
            Recherchez rapidement un produit précis sans perturber la pagination ni les paramètres d’URL.
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-card-foreground">Prix</div>
            <div className="text-xs font-semibold text-muted-foreground">
              {metadataLoading ? "Calcul..." : hasPriceBounds ? `${formatTnd(minBound)} - ${formatTnd(maxBound)} TND` : "Indisponible"}
            </div>
          </div>

          <div className="rounded-[26px] border border-border/70 bg-muted/25 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-semibold text-card-foreground">
                Min sélectionné : {hasPriceBounds ? formatTnd(currentMin) : "0.000"} TND
              </span>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Max sélectionné : {hasPriceBounds ? formatTnd(currentMax) : "0.000"} TND
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Min</label>
                <Input
                  type="number"
                  min={hasPriceBounds ? String(minBound) : "0"}
                  max={hasPriceBounds ? String(currentMax) : undefined}
                  step="0.001"
                  value={filters.minPrice}
                  onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
                  placeholder={hasPriceBounds ? formatTnd(minBound) : "0.000"}
                  disabled={!hasPriceBounds}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Max</label>
                <Input
                  type="number"
                  min={hasPriceBounds ? String(currentMin) : "0"}
                  max={hasPriceBounds ? String(effectiveMaxBound) : undefined}
                  step="0.001"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
                  placeholder={hasPriceBounds ? formatTnd(maxBound) : "0.000"}
                  disabled={!hasPriceBounds}
                />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="relative h-7">
                <div className="absolute top-1/2 h-2.5 w-full -translate-y-1/2 rounded-full bg-muted" />
                <div
                  className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)/0.65),hsl(var(--primary)))] shadow-[0_8px_24px_-14px_hsl(var(--primary)/0.7)]"
                  style={{ left: `${leftPercent}%`, width: `${Math.max(0, rightPercent - leftPercent)}%` }}
                />

                <input
                  type="range"
                  min={hasPriceBounds ? String(minBound) : "0"}
                  max={hasPriceBounds ? String(effectiveMaxBound) : "0"}
                  step="0.001"
                  value={hasPriceBounds ? currentMin : 0}
                  onChange={(e) => setPriceFromSlider("minPrice", Number(e.target.value))}
                  disabled={!hasPriceBounds}
                  className="pointer-events-none absolute inset-0 h-7 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5.5 [&::-webkit-slider-thumb]:w-5.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary/30 [&::-webkit-slider-thumb]:bg-card [&::-webkit-slider-thumb]:shadow-[0_10px_25px_-12px_rgba(15,23,42,0.6)] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary/30 [&::-moz-range-thumb]:bg-card"
                />
                <input
                  type="range"
                  min={hasPriceBounds ? String(minBound) : "0"}
                  max={hasPriceBounds ? String(effectiveMaxBound) : "0"}
                  step="0.001"
                  value={hasPriceBounds ? currentMax : 0}
                  onChange={(e) => setPriceFromSlider("maxPrice", Number(e.target.value))}
                  disabled={!hasPriceBounds}
                  className="pointer-events-none absolute inset-0 h-7 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5.5 [&::-webkit-slider-thumb]:w-5.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary/30 [&::-webkit-slider-thumb]:bg-card [&::-webkit-slider-thumb]:shadow-[0_10px_25px_-12px_rgba(15,23,42,0.6)] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary/30 [&::-moz-range-thumb]:bg-card"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>{hasPriceBounds ? `${formatTnd(currentMin)} TND` : "0.000 TND"}</span>
                <span>{hasPriceBounds ? `${formatTnd(currentMax)} TND` : "0.000 TND"}</span>
              </div>

              <div className="text-xs text-muted-foreground">
                {metadataLoading
                  ? "Mise à jour de la plage tarifaire..."
                  : metadata && metadata.count > 0
                    ? `Plage calculée sur ${metadata.count} article${metadata.count > 1 ? "s" : ""} selon les autres filtres déjà actifs.`
                    : "Aucune plage de prix disponible pour la combinaison de filtres actuelle."}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-sm font-bold text-card-foreground">Disponibilité</div>
          <div className="grid grid-cols-2 gap-2">
            {stockOptions.map((option) => {
              const selected = filters.stockStatus === option.value;

              return (
                <button
                  key={option.value || "ALL"}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, stockStatus: option.value }))}
                  className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-border/70 bg-card text-card-foreground hover:border-primary/25 hover:bg-accent/45"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-card-foreground">Familles / catalogues</div>
            {filters.catalogueNo ? (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                1 sélection
              </span>
            ) : null}
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto rounded-[24px] border border-border/70 bg-muted/20 p-3">
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, catalogueNo: "" }))}
              className={`w-full rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${
                !filters.catalogueNo
                  ? "border-primary/35 bg-primary/10 text-primary"
                  : "border-border/70 bg-card text-card-foreground hover:border-primary/25 hover:bg-accent/45"
              }`}
            >
              Toutes les familles
            </button>

            {roots.map((root) => (
              <div key={root.cL_No} className="space-y-2">
                <div className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{root.cL_Intitule}</div>
                <CatalogueTreeNode
                  node={root}
                  depth={0}
                  selectedCatalogueNo={filters.catalogueNo}
                  onSelect={(value) => setFilters((prev) => ({ ...prev, catalogueNo: value }))}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-card-foreground">Dépôts</div>
            {filters.depotNos.length > 0 ? (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                {filters.depotNos.length} sélection{filters.depotNos.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto rounded-[24px] border border-border/70 bg-muted/20 p-3">
            {depots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/70 px-4 py-4 text-sm text-muted-foreground">
                Aucun dépôt disponible.
              </div>
            ) : (
              depots.map((depot) => {
                const checked = filters.depotNos.includes(String(depot.dE_No));

                return (
                  <label
                    key={depot.dE_No}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                      checked
                        ? "border-primary/35 bg-primary/10"
                        : "border-border/70 bg-card hover:border-primary/25 hover:bg-accent/45"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                      checked={checked}
                      onChange={(e) => setSelectedDepot(String(depot.dE_No), e.target.checked)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-card-foreground">{depot.dE_Intitule}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{depot.dE_Code || `Dépôt ${depot.dE_No}`}</span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-sm font-bold text-card-foreground">Tri</div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Champ</label>
              <select
                className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                value={filters.sortBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as ArticleSortBy }))}
              >
                <option value="designation">Désignation</option>
                <option value="price">Prix</option>
                <option value="ref">Référence</option>
                <option value="stock">Stock</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Ordre</label>
              <select
                className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                value={filters.sortDirection}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortDirection: e.target.value as SortDirection }))}
              >
                <option value="asc">Croissant</option>
                <option value="desc">Décroissant</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.18))] px-5 py-4 md:px-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          <Button type="button" variant="primary" onClick={onApply} className="w-full px-5">
            Appliquer
          </Button>

          <Button type="button" variant="outline" onClick={onReset} className="w-full px-5">
            Réinitialiser
          </Button>

          <Button type="button" variant="ghost" onClick={() => onClose?.()} className="w-full px-5">
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}