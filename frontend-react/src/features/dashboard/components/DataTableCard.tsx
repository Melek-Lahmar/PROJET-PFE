import type { DashboardTable } from "../types/dashboard";
import { EmptyState } from "./EmptyState";

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
                  {table.columns.map((column) => <td key={column.key} className={`is-${column.align ?? "left"}`}>{row[column.key] ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
