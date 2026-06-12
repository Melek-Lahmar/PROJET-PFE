import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AdminUsersPage } from "./AdminUsersPage";

vi.mock("../api/adminUsersApi", () => ({
  adminListUsers: vi.fn(async () => ({ total: 0, skip: 0, take: 20, items: [] })),
}));

vi.mock("../components/AdminCreateUserModal", () => ({
  AdminCreateUserModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Créer un utilisateur</div> : null,
}));

vi.mock("../components/AdminEditRolesModal", () => ({
  AdminEditRolesModal: () => null,
}));

function renderPage(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={client}>
        <AdminUsersPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("AdminUsersPage", () => {
  it("opens the create modal from ?create=1", async () => {
    renderPage("/admin/users?create=1");

    expect(await screen.findByRole("dialog")).toHaveTextContent("Créer un utilisateur");
  });
});
