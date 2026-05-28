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

function IconSearch(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconRefresh(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 0 1-15.5 6.2" />
      <path d="M3 12A9 9 0 0 1 18.5 5.8" />
      <path d="M18 2v4h4" />
      <path d="M6 22v-4H2" />
    </svg>
  );
}

function formatTnd(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(3);
}

function flattenCatalogueOptions(nodes: CatalogueNode[], depth = 0): Array<{ value: string; label: string; depth: number }> {
  return nodes.flatMap((node) => [
    { value: String(node.cL_No), label: node.cL_Intitule, depth },
    ...flattenCatalogueOptions(node.children ?? [], depth + 1),
  ]);
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
  const catalogueOptions = flattenCatalogueOptions(roots);
  const minPrice = metadata?.minPrice ?? 0;
  const maxPrice = metadata?.maxPrice ?? 0;
  const hasPriceBounds = metadata?.minPrice != null && metadata?.maxPrice != null;

  const stockOptions = [
    { value: "IN_STOCK", label: "En stock", tone: "green" },
    { value: "LOW_STOCK", label: "Stock faible", tone: "amber" },
    { value: "OUT_OF_STOCK", label: "Indisponible", tone: "rose" },
  ];

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

  return (
    <aside className="catalog-pro-filter-panel">
      <div className="catalog-pro-filter-header">
        <div>
          <div className="catalog-pro-filter-title">Filtres</div>
          <div className="catalog-pro-filter-subtitle">
            {activeFilterCount > 0 ? `${activeFilterCount} filtre${activeFilterCount > 1 ? "s" : ""} actif${activeFilterCount > 1 ? "s" : ""}` : "Affinez votre recherche"}
          </div>
        </div>

        <button type="button" onClick={onReset} className="catalog-pro-reset-btn" title="Réinitialiser les filtres">
          <IconRefresh className="h-4 w-4" />
          <span>Réinitialiser</span>
        </button>

        {onClose ? (
          <button type="button" onClick={onClose} className="catalog-pro-close-btn" aria-label="Fermer les filtres">
            ×
          </button>
        ) : null}
      </div>

      <div className="catalog-pro-filter-body">
        <section className="space-y-3">
          <label className="catalog-pro-section-label">Recherche</label>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Rechercher..."
              className="catalog-pro-input pl-11"
            />
          </div>
        </section>

        <section className="space-y-3">
          <label className="catalog-pro-section-label">Catégories</label>
          <select
            className="catalog-pro-select"
            value={filters.catalogueNo}
            onChange={(e) => setFilters((prev) => ({ ...prev, catalogueNo: e.target.value }))}
          >
            <option value="">Toutes les catégories</option>
            {catalogueOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {`${"— ".repeat(option.depth)}${option.label}`}
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="catalog-pro-section-label">Disponibilité</label>
            {filters.stockStatus ? (
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, stockStatus: "" }))}
                className="text-xs font-black text-blue-600 hover:underline dark:text-blue-300"
              >
                Tout
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            {stockOptions.map((option) => {
              const selected = filters.stockStatus === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, stockStatus: selected ? "" : option.value }))}
                  className={["catalog-pro-check-row", selected ? "catalog-pro-check-row-active" : ""].join(" ")}
                >
                  <span className={`catalog-pro-checkbox catalog-pro-checkbox-${option.tone}`} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="catalog-pro-section-label">Prix (TND)</label>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              {metadataLoading ? "Calcul..." : hasPriceBounds ? `${formatTnd(minPrice)} - ${formatTnd(maxPrice)}` : "—"}
            </span>
          </div>

          <div className="catalog-pro-price-range">
            <div className="h-2 rounded-full bg-blue-600" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min="0"
              step="0.001"
              value={filters.minPrice}
              onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
              placeholder="0"
              className="catalog-pro-input text-center"
            />
            <Input
              type="number"
              min="0"
              step="0.001"
              value={filters.maxPrice}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
              placeholder="100000"
              className="catalog-pro-input text-center"
            />
          </div>
        </section>

        <section className="space-y-3">
          <label className="catalog-pro-section-label">Dépôts</label>
          <div className="catalog-pro-depot-list">
            {depots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                Aucun dépôt disponible.
              </div>
            ) : (
              depots.slice(0, 8).map((depot) => {
                const checked = filters.depotNos.includes(String(depot.dE_No));
                return (
                  <label key={depot.dE_No} className={["catalog-pro-depot-row", checked ? "catalog-pro-depot-row-active" : ""].join(" ")}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                      checked={checked}
                      onChange={(e) => setSelectedDepot(String(depot.dE_No), e.target.checked)}
                    />
                    <span className="min-w-0 flex-1 truncate">{depot.dE_Intitule}</span>
                  </label>
                );
              })
            )}
          </div>
        </section>

        <section className="space-y-3">
          <label className="catalog-pro-section-label">Tri</label>
          <div className="grid grid-cols-2 gap-3">
            <select
              className="catalog-pro-select"
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as ArticleSortBy }))}
            >
              <option value="designation">Désignation</option>
              <option value="price">Prix</option>
              <option value="ref">Référence</option>
              <option value="stock">Stock</option>
            </select>
            <select
              className="catalog-pro-select"
              value={filters.sortDirection}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortDirection: e.target.value as SortDirection }))}
            >
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        </section>
      </div>

      <div className="catalog-pro-filter-footer">
        <Button type="button" variant="primary" onClick={onApply} className="h-11 w-full rounded-2xl font-black">
          Appliquer les filtres
        </Button>
      </div>
    </aside>
  );
}