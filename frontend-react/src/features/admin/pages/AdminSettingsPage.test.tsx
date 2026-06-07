import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../../shared/components/premium/Toast";
import { AdminSettingsPage } from "./AdminSettingsPage";

vi.mock("../api/settingsApi", () => ({
  listSettings: vi.fn(async () => []),
  getDeliveryFee: vi.fn(async () => ({
    key: "checkout.deliveryFee.home",
    value: 8,
    isPublic: true,
    updatedAt: null,
    updatedByAdminId: null,
  })),
  putSetting: vi.fn(async () => ({})),
  putDeliveryFee: vi.fn(async (value: number) => ({
    key: "checkout.deliveryFee.home",
    value,
    isPublic: true,
    updatedAt: null,
    updatedByAdminId: null,
  })),
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AdminSettingsPage />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("AdminSettingsPage", () => {
  it("shows footer and delivery fee cards", async () => {
    renderPage();

    expect(await screen.findByText("Paramétrage du footer")).toBeInTheDocument();
    expect(screen.getByText("Frais de livraison")).toBeInTheDocument();
  });

  it("allows entering a new delivery fee value", async () => {
    const api = await import("../api/settingsApi");
    renderPage();

    fireEvent.click(await screen.findByText("Frais de livraison"));

    const input = await screen.findByLabelText(/Frais fixe domicile/i);
    fireEvent.change(input, { target: { value: "9.500" } });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer le frais/i }));

    await waitFor(() => {
      expect(api.putDeliveryFee).toHaveBeenCalledWith(9.5);
    });
  });
});
