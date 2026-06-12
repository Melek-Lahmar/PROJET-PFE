import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { Loader } from "../../../shared/components/Loader";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import {
  cancelVirtualPayment,
  confirmVirtualPayment,
  getVirtualPaymentStatus,
  getVirtualTestCards,
} from "../api/virtualPaymentsApi";
import { EmptyView } from "../../../shared/components/premium";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers de formatage + validation (miroir des règles backend VirtualPaymentService)
// ──────────────────────────────────────────────────────────────────────────────

function money(value: number, currency: string) {
  return `${value.toFixed(3)} ${currency}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D+/g, "");
}

function formatCardNumber(raw: string) {
  const digits = onlyDigits(raw).slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = onlyDigits(raw).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

type CardBrand = "visa" | "mastercard" | "amex" | "card";

function detectBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "card";
}

function brandLabel(brand: CardBrand) {
  return brand === "visa" ? "VISA" : brand === "mastercard" ? "Mastercard" : brand === "amex" ? "AMEX" : "Carte";
}

function isCardNumberValid(digits: string) {
  return digits.length >= 13 && digits.length <= 19;
}

function isExpiryValid(expiry: string) {
  const m = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

type FormState = {
  cardNumber: string;
  expiry: string;
  cvv: string;
  cardHolderName: string;
  otp: string;
};

const initialForm: FormState = { cardNumber: "", expiry: "", cvv: "", cardHolderName: "", otp: "" };

type Step = "card" | "otp";

// ──────────────────────────────────────────────────────────────────────────────

export function VirtualPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const piece = (searchParams.get("piece") ?? "").trim();
  const paymentRef = (searchParams.get("paymentRef") ?? "").trim();

  const [form, setForm] = useState<FormState>(initialForm);
  const [step, setStep] = useState<Step>("card");
  const [showTestCards, setShowTestCards] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["virtual-payment-status", piece, paymentRef],
    queryFn: () => getVirtualPaymentStatus(piece, paymentRef),
    enabled: Boolean(piece && paymentRef),
  });

  const testCardsQuery = useQuery({
    queryKey: ["virtual-test-cards"],
    queryFn: () => getVirtualTestCards(),
    enabled: showTestCards,
    staleTime: 5 * 60_000,
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
        cardNumber: onlyDigits(form.cardNumber),
        expiry: form.expiry,
        cvv: form.cvv,
        cardHolderName: form.cardHolderName.trim(),
        otp: form.otp,
      }),
    onSuccess: () => navigate(returnUrl, { replace: true }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelVirtualPayment(piece, paymentRef),
    onSuccess: () => navigate(returnUrl, { replace: true }),
  });

  const status = statusQuery.data;
  const isFinal = Boolean(status?.isFinal);
  const isBusy = confirmMutation.isPending || cancelMutation.isPending;
  const error = confirmMutation.error ?? cancelMutation.error ?? statusQuery.error;

  const cardDigits = onlyDigits(form.cardNumber);
  const brand = detectBrand(cardDigits);

  const fieldErrors = {
    cardNumber: form.cardNumber && !isCardNumberValid(cardDigits) ? "Numéro de carte invalide (13 à 19 chiffres)." : "",
    expiry: form.expiry && !isExpiryValid(form.expiry) ? "Date invalide ou carte expirée (MM/AA)." : "",
    cvv: form.cvv && !/^\d{3}$/.test(form.cvv) ? "Le CVV doit contenir 3 chiffres." : "",
    cardHolderName: form.cardHolderName && form.cardHolderName.trim().length < 2 ? "Nom du porteur requis." : "",
    otp: form.otp && !/^\d{6}$/.test(form.otp) ? "Le code de vérification doit contenir 6 chiffres." : "",
  };

  const cardStepValid =
    isCardNumberValid(cardDigits) &&
    isExpiryValid(form.expiry) &&
    /^\d{3}$/.test(form.cvv) &&
    form.cardHolderName.trim().length >= 2;

  const otpStepValid = /^\d{6}$/.test(form.otp);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyTestCard(cardNumber: string) {
    setForm({
      cardNumber: formatCardNumber(cardNumber),
      expiry: "12/30",
      cvv: "123",
      cardHolderName: form.cardHolderName.trim() || "CLIENT TEST",
      otp: "123456",
    });
    setShowTestCards(false);
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
              <Button type="button" size="lg">Retour au panier</Button>
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

  const amountLabel = status ? money(status.amount, status.currency) : "—";

  return (
    <div className="mx-auto w-full max-w-[560px] py-8">
      {/* En-tête type checkout hébergé Konnect */}
      <div className="overflow-hidden rounded-t-[28px] border border-b-0 border-border/70 bg-gradient-to-br from-[#1b9aaa] via-[#157f9c] to-[#0f5e8c] px-7 py-7 text-white shadow-[0_30px_90px_-60px_rgba(15,23,42,0.9)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg font-black">K</span>
            <span className="text-lg font-black tracking-tight">Konnect</span>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]">
            Paiement sécurisé
          </span>
        </div>
        <div className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Montant à payer</div>
        <div className="mt-1 text-4xl font-black tracking-tight">{amountLabel}</div>
        <div className="mt-2 text-sm text-white/80">
          Commande <span className="font-mono font-bold">{piece}</span>
          {status?.isSandbox ? " · environnement sandbox sécurisé" : ""}
        </div>
      </div>

      <section className="space-y-6 rounded-b-[28px] border border-border/70 bg-card px-6 py-7 shadow-[0_40px_120px_-70px_rgba(15,23,42,0.85)] md:px-8">
        {/* Aperçu carte */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-5 text-white shadow-lg">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="flex items-center justify-between">
            <div className="h-7 w-10 rounded-md bg-gradient-to-br from-amber-300 to-amber-500" />
            <span className="text-sm font-black tracking-wide">{brandLabel(brand)}</span>
          </div>
          <div className="mt-5 font-mono text-lg tracking-[0.18em]">
            {form.cardNumber || "•••• •••• •••• ••••"}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] uppercase text-white/50">Titulaire</div>
              <div className="font-semibold uppercase">{form.cardHolderName || "NOM PRÉNOM"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-white/50">Expire</div>
              <div className="font-semibold">{form.expiry || "MM/AA"}</div>
            </div>
          </div>
        </div>

        {isFinal ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            Ce paiement est déjà finalisé. Aucune nouvelle confirmation ne peut être envoyée.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.12)] p-4 text-sm text-[hsl(var(--danger))]">
            {getApiErrorMessage(error)}
          </div>
        ) : null}

        {!isFinal && step === "card" ? (
          <div className="space-y-4">
            <Field label="Numéro de carte" error={fieldErrors.cardNumber}>
              <input
                className={inputCls(fieldErrors.cardNumber)}
                value={form.cardNumber}
                onChange={(e) => updateField("cardNumber", formatCardNumber(e.target.value))}
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                disabled={isBusy}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Expiration" error={fieldErrors.expiry}>
                <input
                  className={inputCls(fieldErrors.expiry)}
                  value={form.expiry}
                  onChange={(e) => updateField("expiry", formatExpiry(e.target.value))}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/AA"
                  disabled={isBusy}
                />
              </Field>
              <Field label="CVV" error={fieldErrors.cvv}>
                <input
                  className={inputCls(fieldErrors.cvv)}
                  value={form.cvv}
                  onChange={(e) => updateField("cvv", onlyDigits(e.target.value).slice(0, 3))}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="123"
                  disabled={isBusy}
                />
              </Field>
            </div>

            <Field label="Nom du porteur" error={fieldErrors.cardHolderName}>
              <input
                className={inputCls(fieldErrors.cardHolderName)}
                value={form.cardHolderName}
                onChange={(e) => updateField("cardHolderName", e.target.value)}
                autoComplete="cc-name"
                placeholder="Nom Prénom"
                disabled={isBusy}
              />
            </Field>

            <Button
              type="button"
              variant="primary"
              size="lg"
              className="h-12 w-full rounded-2xl text-base font-extrabold"
              disabled={!cardStepValid || isBusy}
              onClick={() => setStep("otp")}
            >
              Continuer
            </Button>

            <button
              type="button"
              onClick={() => setShowTestCards((v) => !v)}
              className="w-full text-center text-xs font-bold text-muted-foreground underline-offset-2 hover:underline"
            >
              {showTestCards ? "Masquer les cartes de test" : "Utiliser une carte de test (sandbox)"}
            </button>

            {showTestCards ? (
              <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/20 p-3">
                {testCardsQuery.isLoading ? (
                  <div className="text-xs text-muted-foreground">Chargement des cartes de test…</div>
                ) : (
                  (testCardsQuery.data ?? []).map((c) => (
                    <button
                      key={c.cardNumber}
                      type="button"
                      onClick={() => applyTestCard(c.cardNumber)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left transition hover:bg-muted"
                    >
                      <span className="font-mono text-xs font-bold text-card-foreground">{c.cardNumber}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          c.result === "SUCCES"
                            ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                        }`}
                      >
                        {c.result}
                      </span>
                    </button>
                  ))
                )}
                <div className="text-[11px] text-muted-foreground">CVV de test : 123 · OTP : 123456</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!isFinal && step === "otp" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              <div className="font-bold text-card-foreground">Vérification 3-D Secure</div>
              Un code de vérification à 6 chiffres a été envoyé à votre banque. Saisissez-le pour valider le paiement de{" "}
              <span className="font-bold text-card-foreground">{amountLabel}</span>.
            </div>

            <Field label="Code de vérification (OTP)" error={fieldErrors.otp}>
              <input
                className={`${inputCls(fieldErrors.otp)} text-center text-2xl font-black tracking-[0.5em]`}
                value={form.otp}
                onChange={(e) => updateField("otp", onlyDigits(e.target.value).slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                disabled={isBusy}
              />
            </Field>

            <Button
              type="button"
              variant="primary"
              size="lg"
              className="h-12 w-full rounded-2xl text-base font-extrabold"
              disabled={!otpStepValid || isBusy}
              isLoading={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              Payer {amountLabel}
            </Button>

            <button
              type="button"
              onClick={() => setStep("card")}
              disabled={isBusy}
              className="w-full text-center text-xs font-bold text-muted-foreground hover:underline"
            >
              ← Revenir aux informations de carte
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Paiement chiffré · aucune donnée carte stockée
          </div>
          <button
            type="button"
            onClick={() => cancelMutation.mutate()}
            disabled={isFinal || isBusy}
            className="text-xs font-bold text-muted-foreground hover:text-[hsl(var(--danger))] disabled:opacity-40"
          >
            Annuler
          </button>
        </div>
      </section>
    </div>
  );
}

// ── petits composants présentationnels ────────────────────────────────────────

function inputCls(error?: string) {
  return [
    "h-12 w-full rounded-2xl border bg-input px-4 text-sm text-card-foreground outline-none transition",
    "placeholder:text-muted-foreground focus:ring-4 focus:ring-primary/10",
    error ? "border-[hsl(var(--danger)/0.5)] focus:border-[hsl(var(--danger))]" : "border-border/80 focus:border-primary/50",
  ].join(" ");
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error ? <div className="text-xs font-semibold text-[hsl(var(--danger))]">{error}</div> : null}
    </div>
  );
}
