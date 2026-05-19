import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { useVendorCartStore } from "../store/vendorCartStore";
import { createVendeurOrder, getVendeurContext, searchVendeurClients } from "../api/vendeurApi";
import type {
  VendeurClientLookupItemDto,
  VendeurCreateBonCommandeRequestDto,
  VendeurPassagerClientDto,
} from "../types/vendeur";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";

function money(v: number) {
  return `${Number(v ?? 0).toFixed(3)} TND`;
}

function PaymentCashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 9h.01M17 15h.01" />
    </svg>
  );
}

function PaymentChequeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h8" />
      <path d="M7 14h4" />
      <path d="M17 10v4" />
    </svg>
  );
}

function PaymentCardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function PaymentGiftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M20 12v8H4v-8" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 7v13" />
      <path d="M12 7H8.5A2.5 2.5 0 1 1 12 3.5V7Z" />
      <path d="M12 7h3.5A2.5 2.5 0 1 0 12 3.5V7Z" />
    </svg>
  );
}

function paymentIcon(code: string) {
  const normalized = (code ?? "").trim().toUpperCase();
  if (normalized.includes("CHEQUE")) return PaymentChequeIcon;
  if (normalized.includes("TPE") || normalized.includes("CARTE")) return PaymentCardIcon;
  if (normalized.includes("PASSCADEAU")) return PaymentGiftIcon;
  return PaymentCashIcon;
}

export function VendeurCheckoutPage() {
  const nav = useNavigate();
  const items = useVendorCartStore((s) => s.items);
  const subtotal = useVendorCartStore((s) => s.subtotal());
  const shipping = useVendorCartStore((s) => s.shipping());
  const stamp = useVendorCartStore((s) => s.stamp());
  const total = useVendorCartStore((s) => s.total());
  const clearCart = useVendorCartStore((s) => s.clear);

  const [customerMode, setCustomerMode] = useState<"EXISTING" | "PASSAGER">("EXISTING");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<VendeurClientLookupItemDto | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  const [passager, setPassager] = useState<VendeurPassagerClientDto>({
    typeClient: "B2C",
    nomComplet: "",
    telephone: "",
    cin: "",
    nomSociete: "",
    matriculeFiscal: "",
    registreCommerce: "",
    numeroTVA: "",
    gouvernorat: "",
    delegation: "",
    adresse: "",
    adresseComplementaire: "",
    codePostal: "",
  });

  const contextQuery = useQuery({
    queryKey: ["vendeur-context"],
    queryFn: getVendeurContext,
    staleTime: 60_000,
  });

  const clientQuery = useQuery({
    queryKey: ["vendeur-clients", clientSearch],
    queryFn: () => searchVendeurClients(clientSearch),
    enabled: customerMode === "EXISTING" && clientSearch.trim().length >= 2,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!contextQuery.data) return;
    if (paymentMethod) return;

    const defaultPayment = contextQuery.data.paymentMethods[0]?.code ?? "";
    if (defaultPayment) {
      setPaymentMethod(defaultPayment);
    }
  }, [contextQuery.data, paymentMethod]);

  useEffect(() => {
    if (customerMode !== "EXISTING") {
      setSelectedClient(null);
    }
  }, [customerMode]);

  const lines = useMemo(
    () => items.map((item) => ({ articleRef: item.arRef, qty: item.qty })),
    [items]
  );

  const passagerErrors = useMemo(() => {
    if (customerMode !== "PASSAGER") return [] as string[];
    const errors: string[] = [];
    if (passager.typeClient === "B2C" && !(passager.nomComplet ?? "").trim()) {
      errors.push("Nom complet passager requis.");
    }
    if (passager.typeClient === "B2B" && !(passager.nomSociete ?? "").trim()) {
      errors.push("Nom société passager requis.");
    }
    return errors;
  }, [customerMode, passager]);

  const canSubmit = useMemo(() => {
    if (!contextQuery.data) return false;
    if (items.length === 0) return false;
    if (customerMode === "EXISTING" && !selectedClient) return false;
    if (customerMode === "PASSAGER" && passagerErrors.length > 0) return false;
    if (!paymentMethod.trim()) return false;
    return true;
  }, [contextQuery.data, items.length, customerMode, selectedClient, passagerErrors.length, paymentMethod]);

  const mut = useMutation({
    mutationFn: async () => {
      const payload: VendeurCreateBonCommandeRequestDto = {
        customerMode,
        clientUserId: customerMode === "EXISTING" ? selectedClient?.userId ?? null : null,
        passager:
          customerMode === "PASSAGER"
            ? {
                typeClient: passager.typeClient,
                nomComplet: passager.nomComplet?.trim() || undefined,
                telephone: passager.telephone?.trim() || undefined,
                cin: passager.cin?.trim() || undefined,
                nomSociete: passager.nomSociete?.trim() || undefined,
                matriculeFiscal: passager.matriculeFiscal?.trim() || undefined,
                registreCommerce: passager.registreCommerce?.trim() || undefined,
                numeroTVA: passager.numeroTVA?.trim() || undefined,
                gouvernorat: passager.gouvernorat?.trim() || undefined,
                delegation: passager.delegation?.trim() || undefined,
                adresse: passager.adresse?.trim() || undefined,
                adresseComplementaire: passager.adresseComplementaire?.trim() || undefined,
                codePostal: passager.codePostal?.trim() || undefined,
              }
            : undefined,
        paymentMethod: paymentMethod.trim(),
        lines,
      };

      return await createVendeurOrder(payload);
    },
    onSuccess: (created) => {
      clearCart();
      nav(`/vendeur/orders/${created.piece}`);
    },
  });

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl app-surface px-8 py-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-card-foreground">Panier vendeur vide</h1>
        <p className="mt-3 text-sm text-muted-foreground">Ajoutez des produits avant de passer au checkout vendeur.</p>
        <div className="mt-8"><Link to="/vendeur/articles"><Button type="button" variant="primary">Retour catalogue vendeur</Button></Link></div>
      </div>
    );
  }

  if (contextQuery.isPending) {
    return <Loader label="Chargement du contexte vendeur..." />;
  }

  if (contextQuery.isError || !contextQuery.data) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-10">
        <section className="app-surface px-6 py-6 md:px-7 md:py-7">
          <div className="space-y-2">
            <div className="app-kicker">Espace vendeur</div>
            <h1 className="app-title">Checkout vendeur</h1>
            <p className="app-description max-w-3xl">
              Impossible de charger le dépôt vendeur. La validation de la commande est bloquée tant que le profil vendeur n'est pas correctement rattaché à un dépôt.
            </p>
          </div>
        </section>
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 text-sm text-rose-700 shadow-sm">
          {getApiErrorMessage(contextQuery.error)}
        </div>
      </div>
    );
  }

  const vendeurContext = contextQuery.data;

  return (
    <div className="w-full space-y-6 pb-10">
      <section className="app-surface px-6 py-6 md:px-7 md:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="app-kicker">Espace vendeur</div>
            <h1 className="app-title">Checkout vendeur</h1>
            <p className="app-description max-w-3xl">
              Le flux vendeur est isolé du checkout client standard. La remise est automatiquement fixée sur {vendeurContext.modeRemise} dans le dépôt du vendeur.
            </p>
          </div>
          <Link to="/vendeur/cart"><Button type="button" variant="outline">← Retour panier vendeur</Button></Link>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:col-span-7">
          <section className="app-surface px-6 py-6 md:px-7 md:py-7 space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contexte vendeur</div>
              <h2 className="mt-1 text-lg font-extrabold text-card-foreground">Dépôt et remise</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5 ring-4 ring-primary/10">
                <div className="text-xl">🏪</div>
                <div className="mt-1 font-bold text-card-foreground">{vendeurContext.modeRemise}</div>
                <div className="text-xs text-muted-foreground">Remise sur place imposée</div>
              </div>

              <div className="rounded-2xl border border-border bg-[hsl(var(--input))] p-5 text-sm">
                <div className="font-bold text-card-foreground">
                  {vendeurContext.depot.depotIntitule || `Dépôt #${vendeurContext.depot.depotNo}`}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {vendeurContext.depot.depotCode ? `Code : ${vendeurContext.depot.depotCode}` : `N° ${vendeurContext.depot.depotNo}`}
                </div>
                <div className="mt-2 text-card-foreground">{vendeurContext.depot.address || "Adresse dépôt non renseignée"}</div>
                <div className="text-muted-foreground">{[vendeurContext.depot.postalCode, vendeurContext.depot.city].filter(Boolean).join(" ") || "-"}</div>
              </div>
            </div>
          </section>

          <section className="app-surface px-6 py-6 md:px-7 md:py-7 space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</div>
              <h2 className="mt-1 text-lg font-extrabold text-card-foreground">Type de commande</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setCustomerMode("EXISTING")}
                className={`rounded-2xl border-2 p-5 text-left transition ${customerMode === "EXISTING" ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border/70 bg-[hsl(var(--input))] hover:border-primary/20"}`}
              >
                <div className="text-xl">👤</div>
                <div className="mt-1 font-bold text-card-foreground">Client existant</div>
                <div className="text-xs text-muted-foreground">Recherche dans la base actuelle</div>
              </button>

              <button
                type="button"
                onClick={() => setCustomerMode("PASSAGER")}
                className={`rounded-2xl border-2 p-5 text-left transition ${customerMode === "PASSAGER" ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border/70 bg-[hsl(var(--input))] hover:border-primary/20"}`}
              >
                <div className="text-xl">🧾</div>
                <div className="mt-1 font-bold text-card-foreground">Client passager</div>
                <div className="text-xs text-muted-foreground">Snapshot enregistré dans la commande</div>
              </button>
            </div>

            {customerMode === "EXISTING" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-card-foreground">Recherche client</label>
                  <Input
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Nom, société, téléphone, code client..."
                  />
                </div>

                {clientQuery.isLoading ? <Loader label="Recherche clients..." /> : null}

                {clientQuery.data && clientQuery.data.length > 0 ? (
                  <div className="grid gap-3">
                    {clientQuery.data.map((client) => {
                      const selected = selectedClient?.userId === client.userId;
                      return (
                        <button
                          type="button"
                          key={client.userId}
                          onClick={() => setSelectedClient(client)}
                          className={`rounded-2xl border px-4 py-4 text-left transition ${selected ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border bg-[hsl(var(--input))] hover:border-primary/20"}`}
                        >
                          <div className="font-bold text-card-foreground">{client.displayName || client.email}</div>
                          <div className="mt-2 text-sm text-muted-foreground">{client.email}</div>
                          <div className="mt-2 text-sm text-muted-foreground">{client.telephone || client.codeClientSage || "-"}</div>
                        </button>
                      );
                    })}
                  </div>
                ) : clientSearch.trim().length >= 2 && !clientQuery.isLoading ? (
                  <div className="rounded-2xl border border-border bg-[hsl(var(--input))] px-4 py-4 text-sm text-muted-foreground">Aucun client trouvé.</div>
                ) : null}

                {selectedClient ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4 text-sm text-emerald-800">
                    <div className="font-bold">Client sélectionné : {selectedClient.displayName || selectedClient.email}</div>
                    <div className="mt-1">Code client : {selectedClient.codeClientSage || "-"}</div>
                    <div className="mt-1">Téléphone : {selectedClient.telephone || "-"}</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-card-foreground">Type client passager</label>
                  <select
                    className="flex h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground shadow-sm"
                    value={passager.typeClient}
                    onChange={(e) => setPassager((prev) => ({ ...prev, typeClient: e.target.value as "B2C" | "B2B" }))}
                  >
                    <option value="B2C">B2C</option>
                    <option value="B2B">B2B</option>
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {passager.typeClient === "B2C" ? (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-card-foreground">Nom complet *</label>
                      <Input value={passager.nomComplet ?? ""} onChange={(e) => setPassager((prev) => ({ ...prev, nomComplet: e.target.value }))} />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-card-foreground">Nom société *</label>
                      <Input value={passager.nomSociete ?? ""} onChange={(e) => setPassager((prev) => ({ ...prev, nomSociete: e.target.value }))} />
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-card-foreground">Téléphone</label>
                    <Input value={passager.telephone ?? ""} onChange={(e) => setPassager((prev) => ({ ...prev, telephone: e.target.value }))} />
                  </div>

                  {passager.typeClient === "B2C" ? (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-card-foreground">CIN</label>
                      <Input value={passager.cin ?? ""} onChange={(e) => setPassager((prev) => ({ ...prev, cin: e.target.value }))} />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-card-foreground">Matricule fiscal</label>
                      <Input value={passager.matriculeFiscal ?? ""} onChange={(e) => setPassager((prev) => ({ ...prev, matriculeFiscal: e.target.value }))} />
                    </div>
                  )}

                  {passager.typeClient === "B2B" ? (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-card-foreground">Registre commerce</label>
                        <Input value={passager.registreCommerce ?? ""} onChange={(e) => setPassager((prev) => ({ ...prev, registreCommerce: e.target.value }))} />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-card-foreground">Numéro TVA</label>
                        <Input value={passager.numeroTVA ?? ""} onChange={(e) => setPassager((prev) => ({ ...prev, numeroTVA: e.target.value }))} />
                      </div>
                    </>
                  ) : null}
                </div>

                {passagerErrors.length > 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4 text-sm text-amber-800">
                    {passagerErrors.map((err) => <div key={err}>{err}</div>)}
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section className="app-surface px-6 py-6 md:px-7 md:py-7 space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paiement</div>
              <h2 className="mt-1 text-lg font-extrabold text-card-foreground">Mode autorisé pour SUR_PLACE</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {vendeurContext.paymentMethods.map((method) => {
                const active = paymentMethod === method.code;
                const Icon = paymentIcon(method.code);
                return (
                  <button
                    key={method.code}
                    type="button"
                    onClick={() => setPaymentMethod(method.code)}
                    className={`rounded-2xl border-2 p-5 text-left transition ${active ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border/70 bg-[hsl(var(--input))] hover:border-primary/20"}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{method.code}</div>
                        <div className="mt-1 font-bold text-card-foreground">{method.label}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-5">
          <section className="app-surface px-6 py-6 space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Résumé</div>
              <h2 className="mt-1 text-lg font-extrabold text-card-foreground">Commande vendeur</h2>
            </div>

            <div className="rounded-2xl border border-border bg-[hsl(var(--input))] px-4 py-4 text-sm space-y-2">
              <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Mode remise</span><span className="font-semibold text-card-foreground">{vendeurContext.modeRemise}</span></div>
              <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Dépôt</span><span className="max-w-[230px] text-right font-semibold text-card-foreground">{vendeurContext.depot.depotIntitule || `Dépôt #${vendeurContext.depot.depotNo}`}</span></div>
              <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">Adresse dépôt</span><span className="max-w-[230px] text-right font-medium text-card-foreground">{vendeurContext.depot.address || "Adresse dépôt non renseignée"}</span></div>
              <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">Paiement</span><span className="font-semibold text-card-foreground">{paymentMethod || "-"}</span></div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Sous-total</span><span className="font-semibold text-card-foreground">{money(subtotal)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Frais livraison</span><span className="font-semibold text-card-foreground">{money(shipping)}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Timbre fiscal</span><span className="font-semibold text-card-foreground">{money(stamp)}</span></div>
              <div className="h-px bg-border/70" />
              <div className="flex items-center justify-between"><span className="text-base font-bold text-card-foreground">Net à payer</span><span className="text-2xl font-black text-primary">{money(total)}</span></div>
            </div>

            {mut.isError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-4 text-sm text-rose-700">
                {getApiErrorMessage(mut.error)}
              </div>
            ) : null}

            <Button type="button" variant="primary" className="w-full" onClick={() => mut.mutate()} disabled={!canSubmit || mut.isPending}>
              {mut.isPending ? "Validation en cours..." : "Valider la commande vendeur"}
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}