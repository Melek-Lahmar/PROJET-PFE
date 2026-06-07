import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminCoverageMapPage } from "./AdminCoverageMapPage";

vi.mock("../api/depotZonesApi", () => ({
  listDepotZones: vi.fn(async () => [
    { id: "1", depotNo: 1, depotName: "Depot Tunis", gouvernorat: "Tunis", delegation: "Carthage", isPrimary: true },
    { id: "2", depotNo: 2, depotName: "Depot Sfax", gouvernorat: "Sfax", delegation: "Sfax Ville", isPrimary: true },
  ]),
}));

vi.mock("../../../geo/api/geoApi", () => ({
  getGouvernorats: vi.fn(async () => [
    { id: 1, name: "Tunis" },
    { id: 2, name: "Sfax" },
  ]),
  getDelegations: vi.fn(async (id: number) => (id === 1 ? ["Carthage", "La Marsa"] : ["Sfax Ville", "Sakiet Ezzit"])),
}));

vi.mock("../../../catalog/api/depotsApi", () => ({
  getDepots: vi.fn(async () => [
    { dE_No: 1, dE_Code: "D01", dE_Intitule: "Depot Tunis", dE_Ville: "Tunis", dE_Principal: 1 },
    { dE_No: 2, dE_Code: "D02", dE_Intitule: "Depot Sfax", dE_Ville: "Sfax", dE_Principal: 1 },
  ]),
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <AdminCoverageMapPage />
    </QueryClientProvider>
  );
}

describe("AdminCoverageMapPage", () => {
  it("renders DB-backed coverage summary and governorate detail", async () => {
    renderPage();

    expect(await screen.findByText("Carte de couverture dynamique")).toBeInTheDocument();
    expect(screen.getByText("Délégations couvertes en base.")).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /Tunis/i }));

    expect(await screen.findByText("Délégations couvertes en base")).toBeInTheDocument();
    expect(screen.getByText("Carthage")).toBeInTheDocument();
    expect(await screen.findByText("La Marsa - Non couverte")).toBeInTheDocument();
  });
});
