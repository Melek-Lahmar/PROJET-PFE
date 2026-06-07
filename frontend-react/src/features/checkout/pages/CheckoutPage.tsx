// src/features/checkout/pages/CheckoutPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../../../shared/components/Button";
import { Loader } from "../../../shared/components/Loader";

import { useCartStore } from "../../cart/store/cartStore";
import { me } from "../../auth/api/authApi";

import { getDepots, type DepotDto } from "../../catalog/api/depotsApi";
import { createOrder } from "../../orders/api/ordersApi";
import type { CreateBonCommandeRequestDto } from "../../orders/types/order";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import {
  initiateVirtualPayment,
  savePendingVirtualPayment,
} from "../../payments/api/virtualPaymentsApi";
import { CheckoutPaymentMethodSelector } from "../../payments/components/CheckoutPaymentMethodSelector";
import type { CheckoutPaymentMethod } from "../../payments/types/konnectPayment";
import { EmptyView, PremiumHero } from "../../../shared/components/premium";

// ── NOUVEAU : composant sélecteur d'adresse ──────────────────────────────────
import { DeliveryAddressSelector } from "../components/DeliveryAddressSelector";

// ─── Types helpers ────────────────────────────────────────────────────────────

type AnyObj = Record<string, unknown>;
type FlatEntry = { path: string; value: unknown };
type StringFlatEntry = { path: string; value: string };

type ShippingDefaults = {
  address: string;
  city: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
};

function isRecord(v: unknown): v is AnyObj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isStringFlatEntry(entry: FlatEntry): entry is StringFlatEntry {
  return typeof entry.value === "string";
}
function flatten(obj: unknown, prefix = "", out: FlatEntry[] = []): FlatEntry[] {
  if (obj === null || obj === undefined) return out;
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => flatten(item, `${prefix}[${idx}]`, out));
    return out;
  }
  if (isRecord(obj)) {
    Object.keys(obj).forEach((k) => {
      const p = prefix ? `${prefix}.${k}` : k;
      flatten(obj[k], p, out);
    });
    return out;
  }
  out.push({ path: prefix, value: obj });
  return out;
}
function normKey(path: string) {
  return path.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function looksLikePostalCode(v: unknown): string | null {
  if (typeof v === "number") {
    const s = String(v);
    return /^\d{4}$/.test(s) ? s : null;
  }
  if (typeof v === "string") {
    const s = v.trim();
    return /^\d{4}$/.test(s) ? s : null;
  }
  return null;
}
function looksLikeLat(v: unknown): number | null {
  const n =
    typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
  if (Number.isNaN(n)) return null;
  return n >= 20 && n <= 45 ? n : null;
}
function looksLikeLng(v: unknown): number | null {
  const n =
    typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
  if (Number.isNaN(n)) return null;
  return n >= -20 && n <= 30 ? n : null;
}

function extractShippingDefaults(meData: unknown): ShippingDefaults {
  const flat = flatten(meData);

  function score(path: string, keywords: string[]) {
    const k = normKey(path);
    let s = 0;
    for (const kw of keywords) {
      if (k.includes(kw)) s += 10;
    }
    if (k.includes("profile") || k.includes("profil")) s += 5;
    if (k.includes("livraison") || k.includes("shipping")) s += 5;
    if (k.includes("adresse") || k.includes("address")) s += 2;
    return s;
  }

  const addressCandidates = flat
    .filter(isStringFlatEntry)
    .filter((x) => x.value.trim().length >= 6)
    .map((x) => ({
      path: x.path,
      value: x.value.trim(),
      s: score(x.path, ["adresse", "address", "addressline", "rue", "street", "livraison", "shipping"]),
    }))
    .sort((a, b) => b.s - a.s);

  const cityCandidates = flat
    .filter(isStringFlatEntry)
    .filter((x) => x.value.trim().length >= 3)
    .map((x) => ({
      path: x.path,
      value: x.value.trim(),
      s: score(x.path, ["delegation", "deleg", "ville", "city", "town", "commune", "gouvernorat", "governorate"]),
    }))
    .sort((a, b) => b.s - a.s);

  const postalCandidates = flat
    .map((x) => {
      const cp = looksLikePostalCode(x.value);
      if (!cp) return null;
      return { path: x.path, value: cp, s: score(x.path, ["codepostal", "postalcode", "zip", "cp", "postcode"]) };
    })
    .filter(Boolean) as { path: string; value: string; s: number }[];
  postalCandidates.sort((a, b) => b.s - a.s);

  const latCandidates = flat
    .map((x) => {
      const n = looksLikeLat(x.value);
      if (n === null) return null;
      return { path: x.path, value: n, s: score(x.path, ["latitude", "lat"]) };
    })
    .filter(Boolean) as { path: string; value: number; s: number }[];
  latCandidates.sort((a, b) => b.s - a.s);

  const lngCandidates = flat
    .map((x) => {
      const n = looksLikeLng(x.value);
      if (n === null) return null;
      return { path: x.path, value: n, s: score(x.path, ["longitude", "lng", "lon"]) };
    })
    .filter(Boolean) as { path: string; value: number; s: number }[];
  lngCandidates.sort((a, b) => b.s - a.s);

  return {
    address: addressCandidates[0]?.value ?? "",
    city: cityCandidates[0]?.value ?? "",
    postalCode: postalCandidates[0]?.value ?? "",
    latitude: latCandidates[0]?.value ?? null,
    longitude: lngCandidates[0]?.value ?? null,
  };
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function CheckoutPage() {
  const nav = useNavigate();

  const items = useCartStore((s) => s.items);
  const deliveryMode = useCartStore((s) => s.deliveryMode);
  const setDeliveryMode = useCartStore((s) => s.setDeliveryMode);
  const subtotal = useCartStore((s) => s.subtotal());
  const shipping = useCartStore((s) => s.shipping());
  const shippingHomeFee = useCartStore((s) => s.shippingHomeFee);
  const stamp = useCartStore((s) => s.stamp());
  const total = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clear);

  const isHome = deliveryMode === "HOME";

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => me(),
  });

  const depotsQuery = useQuery({
    queryKey: ["depots", "checkout"],
    queryFn: () => getDepots(false),
    enabled: !isHome,
  });

  const depots = useMemo(() => depotsQuery.data ?? [], [depotsQuery.data]);

  const b2bDiscount = useMemo(() => {
    const profile = meQuery.data?.profile;
    const isB2B = profile?.typeClient === 1;
    const rawRate = profile?.discountPercent ?? profile?.remise ?? null;
    const rate = typeof rawRate === "number" && Number.isFinite(rawRate) ? Math.min(Math.max(rawRate, 0), 100) : 0;
    const amount = isB2B && rate > 0 ? Number((subtotal * rate / 100).toFixed(3)) : 0;
    const totalAfterDiscount = Math.max(0, subtotal - amount);
    return {
      isApplied: isB2B && rate > 0 && amount > 0,
      rate,
      amount,
      totalAfterDiscount,
      finalTotal: totalAfterDiscount + shipping + stamp,
    };
  }, [meQuery.data?.profile, subtotal, shipping, stamp]);

  const [depotNo, setDepotNo] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("COD");

  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [gouvernorat, setGouvernorat] = useState<string>("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Suivi des champs touchés manuellement (empêche l'écrasement par les données profil)
  const touched = useRef({
    address: false,
    city: false,
    postalCode: false,
    latitude: false,
    longitude: false,
  });

  const [coverageBlocked, setCoverageBlocked] = useState(false);
  const [addressValid, setAddressValid] = useState(false);

  // ── NOUVEAU : callback transmis à DeliveryAddressSelector ─────────────────
  const handleTouched = (
    field: "address" | "city" | "postalCode" | "latitude" | "longitude"
  ) => {
    touched.current[field] = true;
  };

  const effectiveDepotNo = useMemo(() => {
    if (isHome) return 0;
    if (depotNo > 0) return depotNo;
    const principal = depots.find((d: DepotDto) => d.dE_Principal === 1);
    return (principal?.dE_No ?? depots[0]?.dE_No ?? 0) || 0;
  }, [depots, depotNo, isHome]);

  // Pré-remplissage depuis le profil utilisateur (seulement si non touché)
  useEffect(() => {
    if (!meQuery.data) return;
    const s = extractShippingDefaults(meQuery.data);
    setAddress((prev) => (touched.current.address ? prev : prev || s.address));
    setCity((prev) => (touched.current.city ? prev : prev || s.city));
    setPostalCode((prev) => (touched.current.postalCode ? prev : prev || s.postalCode));
    setLatitude((prev) => (touched.current.latitude ? prev : prev !== null ? prev : s.latitude));
    setLongitude((prev) => (touched.current.longitude ? prev : prev !== null ? prev : s.longitude));
  }, [meQuery.data]);

  const lines = useMemo(
    () => items.map((x) => ({ articleRef: x.arRef, qty: x.qty })),
    [items],
  );

  const payload = useMemo<CreateBonCommandeRequestDto>(
    () => ({
      depotNo: isHome ? null : effectiveDepotNo,
      deliveryType: isHome ? "HOME" : "PICKUP",
      paymentMethod,
      address: isHome ? address.trim() : undefined,
      city: isHome ? city.trim() : undefined,
      postalCode: isHome ? postalCode.trim() : undefined,
      gouvernorat: isHome ? gouvernorat.trim() : undefined,
      latitude: isHome ? latitude : null,
      longitude: isHome ? longitude : null,
      lines,
    }),
    [isHome, effectiveDepotNo, paymentMethod, address, city, postalCode, gouvernorat, latitude, longitude, lines],
  );

  const canSubmit = useMemo(() => {
    if (items.length === 0) return false;
    if (isHome && coverageBlocked) return false;
    if (!isHome && effectiveDepotNo <= 0) return false;
    if (isHome) {
      if (!addressValid) return false;
      if (!address.trim() || !city.trim()) return false;
    }
    return true;
  }, [items.length, isHome, coverageBlocked, effectiveDepotNo, addressValid, address, city]);

  const codMutation = useMutation({
    mutationFn: async () => {
      return createOrder({ ...payload, paymentMethod: "COD" });
    },
    onSuccess: (created) => {
      clearCart();
      nav(`/orders/${created.piece}`);
    },
  });

  const virtualMutation = useMutation({
    mutationFn: async () => {
      const response = await initiateVirtualPayment({ ...payload, paymentMethod: "VIRTUAL" });
      if (!response.payUrl) throw new Error("URL de paiement virtuelle manquante.");
      return response;
    },
    onSuccess: (created) => {
      savePendingVirtualPayment({
        piece: created.piece,
        paymentRef: created.paymentRef,
        source: "account",
        amount: created.amount,
        createdAt: Date.now(),
      });
      clearCart();
      window.location.assign(created.payUrl);
    },
  });

  const isSubmitting = codMutation.isPending || virtualMutation.isPending;
  const currentError = codMutation.error ?? virtualMutation.error;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (paymentMethod === "VIRTUAL") {
      virtualMutation.mutate();
      return;
    }
    codMutation.mutate();
  };

  // ── Panier vide ────────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="w-full space-y-6 py-10">
        <PremiumHero
          kicker="Validation"
          title="Validation de commande"
          description="Ajoutez des articles avant de passer commande."
        />
        <EmptyView
          title="Votre panier est vide"
          description="Le checkout n'est accessible qu'avec au moins un article dans votre panier."
          iconPath="M3 3h2l.4 2 M7 13h10l4-8H5.4 M7 13 5.4 5 M7 13l-2 7h13"
          action={
            <Link to="/articles">
              <Button variant="primary" className="h-12 rounded-2xl px-8 text-base font-bold shadow-lg shadow-primary/20">
                Voir le catalogue
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (meQuery.isLoading) return <Loader />;

  // ── Rendu principal ────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-8 pb-10">
      <PremiumHero
        kicker="Bon de Commande (BC)"
        title="Validation de commande"
        description="Vérifiez vos informations de livraison et confirmez le mode de paiement avant la création du BC."
        actions={
          <Link to="/cart">
            <Button variant="outline" className="rounded-2xl">
              ← Retour au panier
            </Button>
          </Link>
        }
      />

      <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
        {/* ── Colonne principale ───────────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-6">
          <div className="app-surface p-8 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="h-6 w-1.5 rounded-full bg-gradient-to-b from-primary to-indigo-500 inline-block" />
              Informations de commande
            </h2>

            {/* ── Mode de livraison ──────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Mode de livraison
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMode("HOME")}
                  className={`text-left rounded-2xl border-2 p-5 transition-all duration-200 active:scale-[0.98] ${
                    isHome
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-sm"
                      : "border-border/60 bg-[hsl(var(--input))] hover:border-primary/25 hover:bg-accent/45"
                  }`}
                >
                  <div className="text-2xl mb-1">🚚</div>
                  <div className="font-bold text-card-foreground">Livraison à domicile</div>
                  <div className="text-xs text-muted-foreground mt-0.5">+ {shippingHomeFee.toFixed(3)} TND</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMode("PICKUP")}
                  className={`text-left rounded-2xl border-2 p-5 transition-all duration-200 active:scale-[0.98] ${
                    !isHome
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-sm"
                      : "border-border/60 bg-[hsl(var(--input))] hover:border-primary/25 hover:bg-accent/45"
                  }`}
                >
                  <div className="text-2xl mb-1">🏪</div>
                  <div className="font-bold text-card-foreground">Retrait au dépôt</div>
                  <div className="mt-0.5 text-xs font-medium text-success">Gratuit</div>
                </button>
              </div>
            </div>

            {/* ── ADRESSE DE LIVRAISON — NOUVEAU composant ───────────────── */}
            {isHome ? (
              <DeliveryAddressSelector
                address={address}
                city={city}
                postalCode={postalCode}
                latitude={latitude}
                longitude={longitude}
                setAddress={setAddress}
                setCity={setCity}
                setPostalCode={setPostalCode}
                setGouvernorat={setGouvernorat}
                setLatitude={setLatitude}
                setLongitude={setLongitude}
                onTouched={handleTouched}
                onCoverageBlocked={setCoverageBlocked}
                onValidityChange={setAddressValid}
              />
            ) : null}

            {/* ── Sélection dépôt PICKUP ─────────────────────────────────── */}
            {!isHome ? (
              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Dépôt de retrait
                </label>
                {depotsQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Chargement des dépôts...</div>
                ) : depots.length === 0 ? (
                  <div className="text-sm text-[hsl(var(--danger))]">Aucun dépôt disponible.</div>
                ) : (
                  <select
                    className="h-11 w-full rounded-2xl border border-border/80 bg-input px-3 py-2 text-sm text-card-foreground outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                    value={effectiveDepotNo}
                    onChange={(e) => setDepotNo(Number(e.target.value))}
                  >
                    {depots.map((d: DepotDto) => (
                      <option key={d.dE_No} value={d.dE_No}>
                        {d.dE_Intitule} ({d.dE_Code})
                        {d.dE_Principal === 1 ? " • Principal" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : null}

            {/* ── Mode de paiement ───────────────────────────────────────── */}
            <CheckoutPaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
              total={b2bDiscount.finalTotal || total}
            />

            {paymentMethod === "VIRTUAL" ? (
              <div className="rounded-2xl border border-primary/15 bg-primary/[0.06] p-4 text-sm text-card-foreground space-y-2">
                <div className="font-semibold">Paiement virtuel sécurisé activé</div>
                <p className="leading-6 text-muted-foreground">
                  En cliquant sur le bouton final, le backend créera la commande locale, initialisera la tentative de paiement, puis vous serez redirigé vers la page bancaire virtuelle.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Colonne récapitulatif ─────────────────────────────────────────── */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="app-surface p-7 space-y-5">
            <h2 className="text-xl font-bold text-card-foreground">Récapitulatif</h2>

            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.arRef} className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-card-foreground">{item.arRef}</div>
                    <div className="text-xs text-muted-foreground">× {item.qty}</div>
                  </div>
                  <span className="shrink-0 font-semibold text-card-foreground">
                    {Number(item.unitPrice * item.qty).toFixed(3)} TND
                  </span>
                </div>
              ))}
            </div>

            <div className="h-px bg-border/70" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-medium">{subtotal.toFixed(3)} TND</span>
              </div>
              {b2bDiscount.isApplied ? (
                <>
                  <div className="flex justify-between text-success">
                    <span>Remise B2B {b2bDiscount.rate.toFixed(2)} %</span>
                    <span className="font-bold">-{b2bDiscount.amount.toFixed(3)} TND</span>
                  </div>
                  <div className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-card-foreground">
                    Remise professionnelle appliquée à votre compte B2B.
                  </div>
                </>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison</span>
                <span className="font-medium">{shipping.toFixed(3)} TND</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timbre fiscal</span>
                <span className="font-medium">{stamp.toFixed(3)} TND</span>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-card-foreground">Total</span>
                <span className="text-xl font-black tracking-tight text-primary">
                  {(b2bDiscount.finalTotal || total).toFixed(3)} TND
                </span>
              </div>
            </div>

            {currentError ? (
              <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
                {getApiErrorMessage(currentError)}
              </div>
            ) : null}

            <Button
              type="button"
              variant="primary"
              className="h-13 w-full rounded-2xl text-base font-extrabold shadow-lg shadow-primary/20"
              disabled={!canSubmit || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting
                ? "Création en cours..."
                : paymentMethod === "VIRTUAL"
                  ? "Payer en ligne →"
                  : "Confirmer la commande"}
            </Button>

            <Link to="/cart" className="block">
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full rounded-2xl text-card-foreground/80"
              >
                ← Retour au panier
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
