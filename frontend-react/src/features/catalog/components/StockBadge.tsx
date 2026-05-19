import type { StockStatus } from "../types/article";
import { stockStatusClass, stockStatusLabel } from "../utils/stock";

export function StockBadge({ status, availableStock, compact = false }: { status: StockStatus; availableStock?: number; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${stockStatusClass(status)}`}>
      {compact ? stockStatusLabel(status) : stockStatusLabel(status, availableStock)}
    </span>
  );
}
