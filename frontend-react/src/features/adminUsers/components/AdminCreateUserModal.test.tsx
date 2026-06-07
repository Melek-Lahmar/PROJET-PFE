import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminCreateUserModal } from "./AdminCreateUserModal";

vi.mock("../api/adminUsersApi", () => ({
  adminCreateUser: vi.fn(async () => ({})),
}));

vi.mock("../../geo/api/geoApi", () => ({
  getGouvernorats: vi.fn(async () => [{ id: 22, name: "Sfax" }]),
  getDelegations: vi.fn(async () => ["Sfax Ville"]),
}));

vi.mock("../../catalog/api/depotsApi", () => ({
  getDepots: vi.fn(async () => [
    { dE_No: 1, dE_Code: "D01", dE_Intitule: "Dépôt principal", dE_Principal: 1 },
  ]),
}));

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <AdminCreateUserModal open onClose={vi.fn()} />
    </QueryClientProvider>
  );
}

describe("AdminCreateUserModal", () => {
  it("shows company fields for CLIENT_B2B", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Type utilisateur/i), { target: { value: "CLIENT_B2B" } });

    expect(await screen.findByLabelText(/Nom société/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Matricule fiscal/i)).toBeInTheDocument();
  });

  it("hides company fields for CLIENT_B2C", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Type utilisateur/i), { target: { value: "CLIENT_B2C" } });

    expect(screen.queryByLabelText(/Nom société/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Matricule fiscal/i)).not.toBeInTheDocument();
  });

  it("shows mandatory depot for LIVREUR_TRANSIT", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Type utilisateur/i), { target: { value: "LIVREUR_TRANSIT" } });

    expect(await screen.findByLabelText(/Dépôt obligatoire/i)).toBeInTheDocument();
  });

  it("hides client company fields for ADMIN", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Type utilisateur/i), { target: { value: "ADMIN" } });

    expect(screen.queryByLabelText(/Nom société/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Matricule fiscal/i)).not.toBeInTheDocument();
  });
});
