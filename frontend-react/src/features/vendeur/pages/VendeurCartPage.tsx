import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../../shared/components/Button";
import { Loader } from "../../../shared/components/Loader";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { getVendeurContext } from "../api/vendeurApi";
import { useVendorCartStore } from "../store/vendorCartStore";

export function VendeurCartPage() {
  const items = useVendorCartStore((s) => s.items);
  const setQty = useVendorCartStore((s) => s.setQty);
  const removeItem = useVendorCartStore((s) => s.removeItem);
  const clear = useVendorCartStore((s) => s.clear);
  const subtotal = useVendorCartStore((s) => s.subtotal());
  const shipping = useVendorCartStore((s) => s.shipping());
  const stamp = useVendorCartStore((s) => s.stamp());
  const total = useVendorCartStore((s) => s.total());

  const contextQuery = useQuery({
    queryKey: ["vendeur-context"],
    queryFn: getVendeurContext,
    staleTime: 60_000,
  });

  const money = (v: number) => `${Number(v ?? 0).toFixed(3)} TND`;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl app-surface px-8 py-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-card-foreground">Panier vendeur vide</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Ajoutez des produits depuis le catalogue vendeur avant de passer à la saisie client.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/vendeur/articles"><Button type="button" variant="primary">Aller au catalogue vendeur</Button></Link>
          <Link to="/vendeur/orders"><Button type="button" variant="outline">Voir les commandes vendeur</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10">
      <section className="app-surface px-6 py-6 md:px-7 md:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="app-kicker">Espace vendeur</div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="app-title">Panier vendeur</h1>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-info">
                {items.length} article{items.length > 1 ? "s" : ""}
              </span>
            </div>
            <p className="app-description">
              Le flux vendeur est verrouillé en remise sur place sur le dépôt rattaché au vendeur connecté.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/vendeur/articles"><Button type="button" variant="outline">Continuer les produits</Button></Link>
            <Button type="button" variant="ghost" className="text-rose-600" onClick={() => clear()}>
              Tout vider
            </Button>
          </div>
        </div>
      </section>

      {contextQuery.isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 text-sm text-rose-700 shadow-sm">
          {getApiErrorMessage(contextQuery.error)}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-7">
          {items.map((item) => (
            <div key={item.arRef} className="app-surface px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold badge-neutral">Réf {item.arRef}</div>
                  <h2 className="text-lg font-extrabold tracking-tight text-card-foreground">{item.designation}</h2>
                  <div className="text-sm text-muted-foreground">PU : <span className="font-semibold text-card-foreground">{money(item.unitPrice)}</span></div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-[hsl(var(--input))] px-2 py-2">
                    <button type="button" className="h-9 w-9 rounded-xl hover:bg-accent" onClick={() => setQty(item.arRef, Math.max(1, item.qty - 1))}>-</button>
                    <input
                      value={item.qty}
                      onChange={(e) => setQty(item.arRef, Number(e.target.value) || 1)}
                      className="h-9 w-20 rounded-xl border border-border bg-card text-center text-sm font-semibold"
                      type="number"
                      min="1"
                    />
                    <button type="button" className="h-9 w-9 rounded-xl hover:bg-accent" onClick={() => setQty(item.arRef, item.qty + 1)}>+</button>
                  </div>

                  <div className="min-w-[120px] text-right">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Ligne</div>
                    <div className="text-lg font-black text-card-foreground">{money(item.unitPrice * item.qty)}</div>
                  </div>

                  <Button type="button" variant="ghost" className="text-rose-600" onClick={() => removeItem(item.arRef)}>
                    Supprimer
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-6 lg:col-span-5">
          <div className="app-surface px-6 py-6 space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remise</div>
              <h2 className="mt-1 text-lg font-extrabold text-card-foreground">Mode de réception vendeur</h2>
            </div>

            {contextQuery.isPending ? (
              <Loader label="Chargement du dépôt vendeur..." />
            ) : contextQuery.data ? (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5 ring-4 ring-primary/10">
                  <div className="text-xl">🏪</div>
                  <div className="mt-1 font-bold text-card-foreground">{contextQuery.data.modeRemise}</div>
                  <div className="text-xs text-muted-foreground">Remise sur place dans le dépôt du vendeur</div>
                </div>
                <div className="rounded-2xl border border-border bg-[hsl(var(--input))] px-4 py-4 text-sm">
                  <div className="font-bold text-card-foreground">
                    {contextQuery.data.depot.depotIntitule || `Dépôt #${contextQuery.data.depot.depotNo}`}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {contextQuery.data.depot.depotCode ? `Code : ${contextQuery.data.depot.depotCode}` : `N° ${contextQuery.data.depot.depotNo}`}
                  </div>
                  <div className="mt-2 text-card-foreground">{contextQuery.data.depot.address || "Adresse dépôt non renseignée"}</div>
                  <div className="text-muted-foreground">{[contextQuery.data.depot.postalCode, contextQuery.data.depot.city].filter(Boolean).join(" ") || "-"}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="app-surface px-6 py-6 space-y-4">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Sous-total</span><span className="font-semibold text-card-foreground">{money(subtotal)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Frais livraison</span><span className="font-semibold text-card-foreground">{money(shipping)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Timbre fiscal</span><span className="font-semibold text-card-foreground">{money(stamp)}</span></div>
            <div className="h-px bg-border/70" />
            <div className="flex items-center justify-between"><span className="text-base font-bold text-card-foreground">Net à payer</span><span className="text-2xl font-black text-primary">{money(total)}</span></div>
            <Link to="/vendeur/checkout" className="block"><Button type="button" variant="primary" className="w-full">Passer au checkout vendeur</Button></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}