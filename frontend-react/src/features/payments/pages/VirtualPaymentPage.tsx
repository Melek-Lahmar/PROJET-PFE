import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import {
  cancelVirtualPayment,
  confirmVirtualPayment,
  getVirtualPaymentStatus,
  getVirtualTestCards,
} from "../api/virtualPaymentsApi";
import type { VirtualTestCardDto } from "../types/virtualPayment";
import { EmptyView } from "../../../shared/components/premium";

type FormState = {
  cardNumber: string;
  expiry: string;
  cvv: string;
  cardHolderName: string;
  otp: string;
};

const initialForm: FormState = {
  cardNumber: "",
  expiry: "",
  cvv: "",
  cardHolderName: "",
  otp: "",
};

function money(value: number, currency: string) {
  return `${value.toFixed(3)} ${currency}`;
}

function fillFromCard(card: VirtualTestCardDto): FormState {
  return {
    cardNumber: card.cardNumber,
    expiry: "12/30",
    cvv: card.cvv,
    cardHolderName: "Client Test",
    otp: card.otp,
  };
}

function compactCard(cardNumber: string) {
  return cardNumber.replace(/\s+/g, "");
}

export function VirtualPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const piece = (searchParams.get("piece") ?? "").trim();
  const paymentRef = (searchParams.get("paymentRef") ?? "").trim();

  const [form, setForm] = useState<FormState>(initialForm);
  const [selectedCard, setSelectedCard] = useState<string>("");

  const statusQuery = useQuery({
    queryKey: ["virtual-payment-status", piece, paymentRef],
    queryFn: () => getVirtualPaymentStatus(piece, paymentRef),
    enabled: Boolean(piece && paymentRef),
  });

  const testCardsQuery = useQuery({
    queryKey: ["virtual-test-cards"],
    queryFn: getVirtualTestCards,
    enabled: Boolean(piece && paymentRef),
  });

  const returnUrl = useMemo(() => {
    const params = new URLSearchParams({ piece, paymentRef });
    return `/checkout/virtual-payment/return?${params.toString()}`;
  }, [piece, paymentRef]);

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmVirtualPayment({
        piece,
        paymentRef,
        cardNumber: form.cardNumber,
        expiry: form.expiry,
        cvv: form.cvv,
        cardHolderName: form.cardHolderName,
        otp: form.otp,
      }),
    onSuccess: () => {
      navigate(returnUrl, { replace: true });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelVirtualPayment(piece, paymentRef),
    onSuccess: () => {
      navigate(returnUrl, { replace: true });
    },
  });

  const status = statusQuery.data;
  const isFinal = Boolean(status?.isFinal);
  const isBusy = confirmMutation.isPending || cancelMutation.isPending;
  const error = confirmMutation.error ?? cancelMutation.error ?? statusQuery.error;

  const canSubmit =
    Boolean(piece && paymentRef) &&
    !isFinal &&
    !isBusy &&
    compactCard(form.cardNumber).length > 0 &&
    form.expiry.trim().length > 0 &&
    form.cvv.trim().length > 0 &&
    form.cardHolderName.trim().length > 0 &&
    form.otp.trim().length > 0;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleUseCard(card: VirtualTestCardDto) {
    setSelectedCard(card.cardNumber);
    setForm(fillFromCard(card));
  }

  if (!piece || !paymentRef) {
    return (
      <div className="w-full py-10">
        <EmptyView
          title="Lien de paiement incomplet"
          description="La référence de commande ou la référence de paiement est absente."
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          action={
            <Link to="/cart">
              <Button type="button" size="lg">
                Retour au panier
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (statusQuery.isLoading) {
    return (
      <section className="app-surface my-10 p-8">
        <Loader />
      </section>
    );
  }

  return (
    <div className="w-full space-y-8 py-10">
      <section className="app-surface overflow-hidden p-0 shadow-[0_40px_120px_-70px_rgba(15,23,42,0.85)]">
        <div className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),hsl(var(--card))] px-6 py-6 md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Virtual Payment Gateway
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-card-foreground">
                Paiement virtuel sécurisé
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Carte de test uniquement — aucune transaction bancaire réelle ne sera effectuée.
              </p>
            </div>

            {status ? (
              <div className="rounded-2xl border border-border/70 bg-card/85 px-5 py-4 shadow-sm lg:min-w-[280px]">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Montant
                </div>
                <div className="mt-2 text-3xl font-black tracking-tight text-primary">
                  {money(status.amount, status.currency)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {status.provider} {status.isSandbox ? "(sandbox)" : ""}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {status ? (
          <div className="grid gap-4 px-6 py-5 md:grid-cols-2 xl:grid-cols-4 md:px-8">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Commande
              </div>
              <div className="mt-2 font-mono text-sm font-bold text-card-foreground">{status.piece}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Référence paiement
              </div>
              <div className="mt-2 break-all font-mono text-sm font-bold text-card-foreground">
                {status.paymentRef}
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Statut
              </div>
              <div className="mt-2 text-sm font-bold text-card-foreground">{status.localStatus}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Provider ID
              </div>
              <div className="mt-2 break-all font-mono text-sm font-bold text-card-foreground">
                {status.providerPaymentId ?? "-"}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <section className="app-surface space-y-6 p-6 md:p-8 lg:col-span-7">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-card-foreground">
              Carte virtuelle
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Les données saisies servent seulement à valider le scénario de test et ne sont pas enregistrées.
            </p>
          </div>

          {isFinal ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
              Ce paiement est finalisé. Aucune nouvelle confirmation ne peut être envoyée.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.12)] p-4 text-sm text-[hsl(var(--danger))]">
              {getApiErrorMessage(error)}
            </div>
          ) : null}

          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Numéro de carte</label>
              <Input
                value={form.cardNumber}
                onChange={(e) => updateField("cardNumber", e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="4242 4242 4242 4242"
                disabled={isFinal || isBusy}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-card-foreground">Date expiration</label>
                <Input
                  value={form.expiry}
                  onChange={(e) => updateField("expiry", e.target.value)}
                  placeholder="MM/YY"
                  autoComplete="off"
                  disabled={isFinal || isBusy}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-card-foreground">CVV</label>
                <Input
                  value={form.cvv}
                  onChange={(e) => updateField("cvv", e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={3}
                  placeholder="123"
                  disabled={isFinal || isBusy}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-card-foreground">Code OTP</label>
                <Input
                  value={form.otp}
                  onChange={(e) => updateField("otp", e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  placeholder="123456"
                  disabled={isFinal || isBusy}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Nom du porteur</label>
              <Input
                value={form.cardHolderName}
                onChange={(e) => updateField("cardHolderName", e.target.value)}
                autoComplete="off"
                placeholder="Client Test"
                disabled={isFinal || isBusy}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="h-12 flex-1 rounded-2xl text-base font-bold"
              disabled={!canSubmit}
              isLoading={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              Payer
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12 rounded-2xl px-6 text-base"
              disabled={isFinal || isBusy}
              isLoading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Annuler
            </Button>
          </div>
        </section>

        <aside className="app-surface space-y-5 p-6 md:p-8 lg:col-span-5">
          <div>
            <h2 className="text-xl font-black tracking-tight text-card-foreground">
              Cartes de test disponibles
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Chaque carte déclenche un état backend différent dans B_PAIEMENT.
            </p>
          </div>

          {testCardsQuery.isLoading ? (
            <Loader />
          ) : (
            <div className="space-y-3">
              {(testCardsQuery.data ?? []).map((card) => (
                <button
                  key={`${card.cardNumber}-${card.externalStatus}`}
                  type="button"
                  onClick={() => handleUseCard(card)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedCard === card.cardNumber
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                      : "border-border bg-card hover:border-primary/30 hover:bg-accent/40"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-mono text-sm font-black text-card-foreground">
                        {card.cardNumber}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{card.message}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                        <span className="rounded-full border border-border/70 bg-muted/30 px-2 py-1">
                          Date 12/30
                        </span>
                        <span className="rounded-full border border-border/70 bg-muted/30 px-2 py-1">
                          CVV {card.cvv}
                        </span>
                        <span className="rounded-full border border-border/70 bg-muted/30 px-2 py-1">
                          OTP {card.otp}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex w-fit rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {card.result}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
