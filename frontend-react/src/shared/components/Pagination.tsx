type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

function buildPageItems(current: number, totalPages: number) {
  if (totalPages <= 1) return [1] as Array<number | "…">;

  const items: Array<number | "…"> = [];
  const add = (value: number | "…") => items.push(value);
  const safeCurrent = Math.max(1, Math.min(current, totalPages));

  if (totalPages <= 7) {
    for (let p = 1; p <= totalPages; p++) add(p);
    return items;
  }

  add(1);

  const start = Math.max(2, safeCurrent - 1);
  const end = Math.min(totalPages - 1, safeCurrent + 1);

  if (start > 2) add("…");

  for (let p = start; p <= end; p++) add(p);

  if (end < totalPages - 1) add("…");

  add(totalPages);
  return items;
}

export function Pagination({ currentPage, totalPages, onPageChange, disabled = false }: PaginationProps) {
  const safeCurrent = Math.max(1, Math.min(currentPage, totalPages || 1));
  const pageItems = buildPageItems(safeCurrent, totalPages);
  const canPrev = safeCurrent > 1 && !disabled;
  const canNext = safeCurrent < totalPages && !disabled;

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => canPrev && onPageChange(safeCurrent - 1)}
        disabled={!canPrev}
        className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm font-medium text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
      >
        Précédent
      </button>

      {pageItems.map((item, index) => {
        if (item === "…") {
          return (
            <span
              key={`dots-${index}`}
              className="inline-flex h-11 min-w-[44px] items-center justify-center px-2 text-sm font-semibold text-muted-foreground"
            >
              …
            </span>
          );
        }

        const active = item === safeCurrent;

        return (
          <button
            key={item}
            type="button"
            onClick={() => !disabled && onPageChange(item)}
            disabled={disabled}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-11 min-w-[44px] items-center justify-center rounded-2xl px-3 text-sm font-semibold transition ${
              active
                ? "border border-primary/20 bg-primary text-white shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.8)]"
                : "border border-border bg-[hsl(var(--input))] text-card-foreground shadow-sm hover:-translate-y-0.5 hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
            }`}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => canNext && onPageChange(safeCurrent + 1)}
        disabled={!canNext}
        className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm font-medium text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
      >
        Suivant
      </button>
    </div>
  );
}