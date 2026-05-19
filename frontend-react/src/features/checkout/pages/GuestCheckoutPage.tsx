import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useCartStore } from "../../cart/store/cartStore";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";

import { getDepots, type DepotDto } from "../../catalog/api/depotsApi";
import { getGouvernorats, getDelegations } from "../../geo/api/geoApi";
import type { GouvernoratItem } from "../../geo/types/geo";

import { createGuestOrder } from "../../orders/api/ordersApi";
import type { CreateGuestBonCommandeRequestDto } from "../../orders/types/order";
import { GuestCheckoutLocationSection } from "../components/GuestCheckoutLocationSection";
import { CheckoutPaymentMethodSelector } from "../../payments/components/CheckoutPaymentMethodSelector";
import {
  initiateVirtualGuestPayment,
  savePendingVirtualPayment,
} from "../../payments/api/virtualPaymentsApi";
import type { CheckoutPaymentMethod } from "../../payments/types/konnectPayment";
import {
  EmptyView,
  PremiumHero,
} from "../../../shared/components/premium";

function sanitizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function GuestCheckoutPage() {
  const navigate = useNavigate();

  const items = useCartStore((s) => s.items);
  const deliveryMode = useCartStore((s) => s.deliveryMode);
  const setDeliveryMode = useCartStore((s) => s.setDeliveryMode);
  const subtotal = useCartStore((s) => s.subtotal());
  const shipping = useCartStore((s) => s.shipping());
  const stamp = useCartStore((s) => s.stamp());
  const total = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clear);

  const isHome = deliveryMode === "HOME";

  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [cin, setCin] = useState("");

  const [gouvernorat, setGouvernorat] = useState<number>(22);
  const [delegation, setDelegation] = useState("");

  const [adresse, setAdresse] = useState("");
  const [adresseComplementaire, setAdresseComplementaire] = useState("");
  const [codePostal, setCodePostal] = useState("");

  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [depotNo, setDepotNo] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("COD");

  const [touchedShipping, setTouchedShipping] = useState({
    address: false,
    city: false,
    postalCode: false,
  });

  const govQuery = useQuery<GouvernoratItem[]>({
    queryKey: ["geo-gouvernorats"],
    queryFn: getGouvernorats,
  });

  const delQuery = useQuery<string[]>({
    queryKey: ["geo-delegations", gouvernorat],
    queryFn: () => getDelegations(gouvernorat),
    enabled: Number.isFinite(gouvernorat),
  });

  const depotsQuery = useQuery<DepotDto[]>({
    queryKey: ["depots", "guest-checkout"],
    queryFn: () => getDepots(false),
    enabled: !isHome,
  });

  const gouvernorats = useMemo(() => govQuery.data ?? [], [govQuery.data]);
  const delegations = useMemo(() => delQuery.data ?? [], [delQuery.data]);
  const depots = useMemo(() => depotsQuery.data ?? [], [depotsQuery.data]);

  const gouvernoratName = useMemo(
    () => gouvernorats.find((g) => g.id === gouvernorat)?.name ?? "",
    [gouvernorats, gouvernorat]
  );

  const effectiveDelegation = useMemo(() => {
    if (delegations.length === 0) return "";
    return delegations.includes(delegation) ? delegation : "";
  }, [delegations, delegation]);

  const effectiveShippingAddress =
    touchedShipping.address || shippingAddress.trim()
      ? shippingAddress
      : adresse;

  const effectiveShippingCity =
    touchedShipping.city || shippingCity.trim()
      ? shippingCity
      : effectiveDelegation || gouvernoratName;

  const effectiveShippingPostalCode =
    touchedShipping.postalCode || shippingPostalCode.trim()
      ? shippingPostalCode
      : codePostal;

  const effectiveDepotNo = useMemo(() => {
    if (isHome) return 0;
    if (depotNo > 0) return depotNo;
    const principal = depots.find((d) => d.dE_Principal === 1);
    return (principal?.dE_No ?? depots[0]?.dE_No ?? 0) || 0;
  }, [depots, depotNo, isHome]);

  const lines = useMemo(
    () => items.map((item) => ({ articleRef: item.arRef, qty: item.qty })),
    [items]
  );

  const canSubmit = useMemo(() => {
    if (items.length === 0) return false;
    if (!nomComplet.trim() || !telephone.trim() || !effectiveDelegation.trim() || !adresse.trim() || !codePostal.trim()) {
      return false;
    }

    if (!isHome && effectiveDepotNo <= 0) return false;

    if (isHome) {
      if (
        !effectiveShippingAddress.trim() ||
        !effectiveShippingCity.trim() ||
        !effectiveShippingPostalCode.trim()
      ) {
        return false;
      }
    }

    return true;
  }, [
    adresse,
    codePostal,
    effectiveDelegation,
    effectiveDepotNo,
    effectiveShippingAddress,
    effectiveShippingCity,
    effectiveShippingPostalCode,
    isHome,
    items.length,
    nomComplet,
    telephone,
  ]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreateGuestBonCommandeRequestDto = {
        depotNo: isHome ? null : effectiveDepotNo,
        deliveryType: isHome ? "HOME" : "PICKUP",
        paymentMethod: "COD",
        address: isHome ? effectiveShippingAddress.trim() : undefined,
        city: isHome ? effectiveShippingCity.trim() : undefined,
        postalCode: isHome ? effectiveShippingPostalCode.trim() : undefined,
        latitude: isHome ? latitude : null,
        longitude: isHome ? longitude : null,
        customer: {
          typeClient: "B2C",
          nomComplet: nomComplet.trim(),
          telephone: telephone.trim(),
          cin: sanitizeOptional(cin),
          gouvernorat: sanitizeOptional(gouvernoratName),
          delegation: sanitizeOptional(effectiveDelegation),
          adresse: adresse.trim(),
          adresseComplementaire: sanitizeOptional(adresseComplementaire),
          codePostal: sanitizeOptional(codePostal),
        },
        lines,
      };

      return createGuestOrder(payload);
    },
    onSuccess: (created) => {
      clearCart();
      navigate(`/checkout/guest/success?piece=${encodeURIComponent(created.piece)}`, {
        replace: true,
      });
    },
  });

  const virtualMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateGuestBonCommandeRequestDto = {
        depotNo: isHome ? null : effectiveDepotNo,
        deliveryType: isHome ? "HOME" : "PICKUP",
        paymentMethod: "VIRTUAL",
        address: isHome ? effectiveShippingAddress.trim() : undefined,
        city: isHome ? effectiveShippingCity.trim() : undefined,
        postalCode: isHome ? effectiveShippingPostalCode.trim() : undefined,
        latitude: isHome ? latitude : null,
        longitude: isHome ? longitude : null,
        customer: {
          typeClient: "B2C",
          nomComplet: nomComplet.trim(),
          telephone: telephone.trim(),
          cin: sanitizeOptional(cin),
          gouvernorat: sanitizeOptional(gouvernoratName),
          delegation: sanitizeOptional(effectiveDelegation),
          adresse: adresse.trim(),
          adresseComplementaire: sanitizeOptional(adresseComplementaire),
          codePostal: sanitizeOptional(codePostal),
        },
        lines,
      };

      const response = await initiateVirtualGuestPayment(payload);
      if (!response.payUrl) {
        throw new Error("URL de paiement virtuelle manquante.");
      }

      return response;
    },
    onSuccess: (created) => {
      savePendingVirtualPayment({
        piece: created.piece,
        paymentRef: created.paymentRef,
        source: "guest",
        amount: created.amount,
        createdAt: Date.now(),
      });

      clearCart();
      window.location.assign(created.payUrl);
    },
  });

  const isSubmitting = mutation.isPending || virtualMutation.isPending;
  const currentError = mutation.error ?? virtualMutation.error;

  const handleSubmit = () => {
    if (!canSubmit) return;

    if (paymentMethod === "VIRTUAL") {
      virtualMutation.mutate();
      return;
    }

    mutation.mutate();
  };

  if (items.length === 0) {
    return (
      <div className="w-full space-y-6 py-10">
        <PremiumHero
          kicker="Checkout invité"
          title="Finaliser la commande sans compte"gradientTitle
          description="Ajoutez des articles avant de lancer une commande invitée."
        />
        <EmptyView
          title="Votre panier est vide"
          description="Le checkout invité a besoin d’au moins un article dans votre panier."
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

  return (
    <div className="w-full space-y-8 pb-10">
      <PremiumHero
        kicker="Checkout invité"
        title="Finaliser la commande sans compte"gradientTitle
        description="Remplissez les informations essentielles du client et de la livraison. Le parcours invité reste B2C par défaut et le flux COD actuel reste intact."
        actions={
          <>
            <Link to="/checkout/start">
              <Button variant="outline" className="rounded-2xl px-5">
                ← Changer de parcours
              </Button>
            </Link>
            <Link to="/login?returnTo=%2Fcheckout">
              <Button variant="ghost" className="rounded-2xl px-5 text-white hover:bg-white/10">
                J’ai déjà un compte
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
        <div className="space-y-6 lg:col-span-7">
          <div className="app-surface space-y-6 p-8">
            <div>
              <h2 className="text-xl font-bold text-card-foreground">Identité du client</h2>
              <p className="mt-1 text-sm text-muted-foreground">Le parcours invité est traité en client B2C par défaut.</p>
            </div>

            <div className="rounded-[22px] border border-primary/15 bg-primary/[0.045] px-4 py-3 text-sm text-card-foreground">
              Type client invité : <span className="font-bold">B2C</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-card-foreground">Nom complet</label>
                <Input value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} placeholder="Nom et prénom" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-card-foreground">Téléphone</label>
                <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Ex: 22123456" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-card-foreground">CIN</label>
                <Input value={cin} onChange={(e) => setCin(e.target.value)} placeholder="Optionnel" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-card-foreground">Complément d’adresse</label>
                <Input
                  value={adresseComplementaire}
                  onChange={(e) => setAdresseComplementaire(e.target.value)}
                  placeholder="Appartement, étage, zone, repère..."
                />
              </div>
            </div>
          </div>

          <GuestCheckoutLocationSection
            gouvernorat={gouvernorat}
            setGouvernorat={setGouvernorat}
            delegation={effectiveDelegation}
            setDelegation={setDelegation}
            gouvernorats={gouvernorats}
            delegations={delegations}
            delegationsLoading={delQuery.isLoading}
            address={adresse}
            setAddress={setAdresse}
            postalCode={codePostal}
            setPostalCode={setCodePostal}
            latitude={latitude}
            setLatitude={setLatitude}
            longitude={longitude}
            setLongitude={setLongitude}
          />

          <div className="app-surface space-y-6 p-8">
            <div>
              <h2 className="text-xl font-bold text-card-foreground">Livraison et paiement</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choisissez le mode de remise puis complétez les informations de livraison si nécessaire. Le paiement virtuel invité passe par le backend comme le parcours connecté.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mode de livraison</label>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMode("HOME")}
                  className={`rounded-2xl border-2 p-5 text-left transition-all duration-200 active:scale-[0.98] ${
                    isHome
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-sm"
                      : "border-border/60 bg-[hsl(var(--input))] hover:border-primary/25 hover:bg-accent/45"
                  }`}
                >
                  <div className="mb-1 text-2xl">🚚</div>
                  <div className="font-bold text-card-foreground">Livraison à domicile</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">+ 8.000 TND</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMode("PICKUP")}
                  className={`rounded-2xl border-2 p-5 text-left transition-all duration-200 active:scale-[0.98] ${
                    !isHome
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-sm"
                      : "border-border/60 bg-[hsl(var(--input))] hover:border-primary/25 hover:bg-accent/45"
                  }`}
                >
                  <div className="mb-1 text-2xl">🏪</div>
                  <div className="font-bold text-card-foreground">Retrait au dépôt</div>
                  <div className="mt-0.5 text-xs font-medium text-[hsl(var(--success))]">Gratuit</div>
                </button>
              </div>
            </div>

            {!isHome ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Dépôt</label>
                {depotsQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">Chargement des dépôts...</div>
                ) : depots.length === 0 ? (
                  <div className="text-sm text-[hsl(var(--danger))]">Aucun dépôt disponible.</div>
                ) : (
                  <select
                    className="flex h-11 w-full rounded-xl border border-input/40 bg-muted/40 px-3 py-2 text-sm"
                    value={effectiveDepotNo}
                    onChange={(e) => setDepotNo(Number(e.target.value))}
                  >
                    {depots.map((d) => (
                      <option key={d.dE_No} value={d.dE_No}>
                        {d.dE_Intitule} ({d.dE_Code})
                        {d.dE_Principal === 1 ? " • Principal" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : null}

            <CheckoutPaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} total={total} />

            {isHome ? (
              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-card-foreground">Adresse de livraison</h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Adresse</label>
                  <Input
                    value={effectiveShippingAddress}
                    onChange={(e) => {
                      setTouchedShipping((prev) => ({ ...prev, address: true }));
                      setShippingAddress(e.target.value);
                    }}
                    placeholder="Ex: Rue ... bâtiment ..."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ville / délégation</label>
                    <Input
                      value={effectiveShippingCity}
                      onChange={(e) => {
                        setTouchedShipping((prev) => ({ ...prev, city: true }));
                        setShippingCity(e.target.value);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Code postal</label>
                    <Input
                      value={effectiveShippingPostalCode}
                      onChange={(e) => {
                        setTouchedShipping((prev) => ({ ...prev, postalCode: true }));
                        setShippingPostalCode(e.target.value);
                      }}
                      placeholder="Ex: 3000"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {currentError ? (
              <div className="space-y-2 rounded-2xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.12)] p-4 text-sm text-[hsl(var(--danger))]">
                <div className="font-semibold">
                  {paymentMethod === "VIRTUAL"
                    ? "Erreur lors de l’initialisation du paiement invité"
                    : "Erreur lors de la création du BC invité"}
                </div>
                <div>{getApiErrorMessage(currentError)}</div>
              </div>
            ) : null}

            <Button
              className="h-12 w-full rounded-2xl text-base font-bold"
              disabled={!canSubmit || isSubmitting}
              onClick={handleSubmit}
            >
              {paymentMethod === "VIRTUAL"
                ? virtualMutation.isPending
                  ? "Redirection vers le paiement virtuel..."
                  : "Payer maintenant"
                : mutation.isPending
                ? "Création en cours..."
                : "Confirmer et créer le BC invité"}
            </Button>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="app-surface sticky top-24 p-8 shadow-[0_30px_90px_-55px_rgba(2,6,23,0.75)]">
            <h2 className="mb-6 text-xl font-bold">Résumé</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-medium text-card-foreground">{subtotal.toFixed(3)} TND</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Frais livraison</span>
                <span className="font-medium text-card-foreground">{shipping.toFixed(3)} TND</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Timbre fiscal</span>
                <span className="font-medium text-card-foreground">{stamp.toFixed(3)} TND</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Paiement sélectionné</span>
                <span className="font-medium text-card-foreground">
                  {paymentMethod === "VIRTUAL" ? "Paiement virtuel sécurisé" : "Paiement à la livraison"}
                </span>
              </div>

              <div className="my-4 border-t-2 border-dashed border-border/60" />

              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-card-foreground">Total TTC</span>
                <span className="text-2xl font-black text-primary">
                  {total.toFixed(3)} <span className="text-sm font-medium text-muted-foreground/70">TND</span>
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-t border-border/50 pt-4 text-xs text-muted-foreground">
              <p>Le backend recalculera les montants finaux, le stock et la cohérence du dépôt sélectionné.</p>
              <p>Le suivi détaillé de cette commande restera réservé aux utilisateurs connectés.</p>
              <p>La localisation sur carte synchronise les champs de zone, d’adresse et de code postal.</p>
              {paymentMethod === "VIRTUAL" ? (
                <p>La commande invitée et la tentative B_PAIEMENT sont créées côté serveur avant la redirection.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
