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

const baseBtn =
  "inline-flex h-10 items-center justify-center rounded-xl border border-border/80 bg-card text-sm font-medium text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-accent/60 hover:shadow-md disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97]";

export function Pagination({ currentPage, totalPages, onPageChange, disabled = false }: PaginationProps) {
  const safeCurrent = Math.max(1, Math.min(currentPage, totalPages || 1));
  const pageItems = buildPageItems(safeCurrent, totalPages);
  const canPrev = safeCurrent > 1 && !disabled;
  const canNext = safeCurrent < totalPages && !disabled;

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => canPrev && onPageChange(safeCurrent - 1)}
        disabled={!canPrev}
        className={`${baseBtn} px-4`}
      >
        ← Précédent
      </button>

      {pageItems.map((item, index) => {
        if (item === "…") {
          return (
            <span
              key={`dots-${index}`}
              className="inline-flex h-10 min-w-[40px] items-center justify-center px-2 text-sm font-semibold text-muted-foreground"
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
            className={`inline-flex h-10 min-w-[40px] items-center justify-center rounded-xl px-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97] ${
              active
                ? "border border-primary/30 bg-primary text-white shadow-[0_12px_28px_-16px_hsl(var(--primary)/0.75)]"
                : `${baseBtn}`
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
        className={`${baseBtn} px-4`}
      >
        Suivant →
      </button>
    </div>
  );
}
