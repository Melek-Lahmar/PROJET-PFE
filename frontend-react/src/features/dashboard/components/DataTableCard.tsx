import type { DashboardTable } from "../types/dashboard";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

function severityFromCell(value: string) {
  const normalized = value.toUpperCase();
  if (/(LIVRE|CONFIRME|VALID|SUCCESS|OK)/.test(normalized)) return "success";
  if (/(ATTENTE|TENTATIVE|REPORTE|PENDING|WARNING)/.test(normalized)) return "warning";
  if (/(REFUS|RETOUR|ECHEC|FAIL|ERROR|CRITICAL|CRITIQUE|ANNUL)/.test(normalized)) return "critical";
  return "info";
}

function renderCell(columnKey: string, value: string | number | null | undefined) {
  const display = value ?? "—";
  if (typeof display !== "string") return display;
  const lowerKey = columnKey.toLowerCase();
  if (lowerKey.includes("status") || lowerKey.includes("statut") || lowerKey.includes("etat")) {
    return <StatusBadge label={display} severity={severityFromCell(display)} />;
  }
  return display;
}

export function DataTableCard({ table }: { table: DashboardTable }) {
  return (
    <section className="pro-card pro-table-card">
      <div className="pro-card__header">
        <div>
          <h3>{table.title}</h3>
          {table.description ? <p>{table.description}</p> : null}
        </div>
      </div>
      {table.rows.length === 0 ? <EmptyState title="Aucune ligne" description="Aucune donnée détaillée disponible avec les filtres actuels." /> : (
        <div className="pro-table-wrap">
          <table className="pro-table">
            <thead>
              <tr>{table.columns.map((column) => <th key={column.key} className={`is-${column.align ?? "left"}`}>{column.label}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.key}>
                  {table.columns.map((column) => <td key={column.key} className={`is-${column.align ?? "left"}`}>{renderCell(column.key, row[column.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
