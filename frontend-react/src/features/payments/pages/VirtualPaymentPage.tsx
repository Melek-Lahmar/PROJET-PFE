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
} from "../api/virtualPaymentsApi";
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

function compactCard(cardNumber: string) {
  return cardNumber.replace(/\s+/g, "");
}

export function VirtualPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const piece = (searchParams.get("piece") ?? "").trim();
  const paymentRef = (searchParams.get("paymentRef") ?? "").trim();

  const [form, setForm] = useState<FormState>(initialForm);

  const statusQuery = useQuery({
    queryKey: ["virtual-payment-status", piece, paymentRef],
    queryFn: () => getVirtualPaymentStatus(piece, paymentRef),
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
                Passerelle de paiement sécurisée
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-card-foreground">
                Paiement virtuel sécurisé
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Effectuez votre paiement en toute sécurité. Vos informations sont protégées à chaque étape.
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
                  {status.provider} {status.isSandbox ? "· sandbox sécurisé" : ""}
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
              Informations de paiement
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Saisissez les informations de votre carte bancaire. Aucune information bancaire n'est stockée sur nos serveurs.
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

        <aside className="app-surface space-y-6 p-6 md:p-8 lg:col-span-5">
          <div>
            <h2 className="text-xl font-black tracking-tight text-card-foreground">
              Résumé du paiement
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Vérifiez les informations avant validation. Le statut réel reste contrôlé par le backend.
            </p>
          </div>

          {status ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Montant à payer</span>
                <span className="font-black text-primary">{money(status.amount, status.currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Commande</span>
                <span className="font-mono font-semibold text-card-foreground">{status.piece}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Référence paiement</span>
                <span className="max-w-[220px] break-all text-right font-mono font-semibold text-card-foreground">{status.paymentRef}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Statut</span>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
                  {status.localStatus}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Environnement</span>
                <span className="font-semibold text-card-foreground">{status.isSandbox ? "Sandbox sécurisé" : "Production"}</span>
              </div>
            </div>
          ) : null}

          <div className="border-t border-border/70 pt-5">
            <div className="text-sm font-black text-card-foreground">Méthodes acceptées</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Mastercard", "Visa", "e-Dinar"].map((method) => (
                <span key={method} className="rounded-2xl border border-border bg-card px-4 py-2 text-sm font-black text-card-foreground shadow-sm">
                  {method}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-border/70 pt-5">
            <div className="text-sm font-black text-card-foreground">Sécurité et confidentialité</div>
            <div className="mt-3 space-y-3">
              {[
                ["Paiement chiffré", "Vos informations sont protégées pendant la saisie."],
                ["Passerelle sécurisée", "La transaction est traitée par le flux existant."],
                ["Validation par OTP", "Un code de vérification est demandé pour confirmer."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-3">
                  <div className="text-sm font-bold text-card-foreground">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-card/75 p-4">
            <div className="text-sm font-black text-card-foreground">Besoin d’aide ?</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Notre équipe support reste disponible pour vous accompagner.</p>
            <div className="mt-4 space-y-1 text-sm font-semibold text-card-foreground">
              <div>+216 00 000 000</div>
              <div>support@ecommerce.tn</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
