import type { StockStatus } from "../types/article";

export function stockStatusLabel(status: StockStatus, availableStock?: number) {
  switch (status) {
    case "IN_STOCK":
      return availableStock && availableStock > 0 ? `En stock (${availableStock})` : "En stock";
    case "LOW_STOCK":
      return availableStock && availableStock > 0 ? `Stock faible (${availableStock})` : "Stock faible";
    case "OUT_OF_STOCK":
      return "Rupture de stock";
    case "NOT_TRACKED":
    default:
      return "Stock non suivi";
  }
}

export function stockStatusClass(status: StockStatus) {
  switch (status) {
    case "IN_STOCK":
      return "badge-success";
    case "LOW_STOCK":
      return "badge-warning";
    case "OUT_OF_STOCK":
      return "badge-danger";
    case "NOT_TRACKED":
    default:
      return "bg-muted/55 text-card-foreground/90 ring-1 ring-border";
  }
}

export function canAddToCart(status: StockStatus) {
  return status !== "OUT_OF_STOCK";
}
