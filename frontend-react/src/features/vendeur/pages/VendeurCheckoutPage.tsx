// src/features/vendeur/pages/VendeurCheckoutPage.tsx
// Formulaire client passager uniquement — gouvernorat & délégation en SELECT avec sync

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";

import { useVendorCartStore } from "../store/vendorCartStore";
import { createVendeurOrder, getVendeurContext } from "../api/vendeurApi";
import type { VendeurContextResponseDto, VendeurPassagerClientDto } from "../types/vendeur";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { getDelegations } from "../../geo/api/geoApi";
import { TUNISIA_GOUVERNORATS } from "../../geo/utils/tunisiaLocationSync";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SELECT_CLASS =
  "h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:opacity-50";

function money(v: number) {
  return `${Number(v ?? 0).toFixed(3)} TND`;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-card-foreground">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{kicker}</div>
      <h2 className="mt-1 text-lg font-extrabold text-card-foreground">{title}</h2>
    </div>
  );
}

// ─── Icônes paiement ──────────────────────────────────────────────────────────

function PayIcon({ code }: { code: string }) {
  const n = code.toUpperCase();
  if (n.includes("CHEQUE")) return <span className="text-xl">📄</span>;
  if (n.includes("TPE") || n.includes("CARTE")) return <span className="text-xl">💳</span>;
  if (n.includes("PASSCADEAU")) return <span className="text-xl">🎁</span>;
  return <span className="text-xl">💵</span>;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function VendeurCheckoutPage() {
  const nav = useNavigate();

  const items = useVendorCartStore((s) => s.items);
  const subtotal = useVendorCartStore((s) => s.subtotal());
  const shipping = useVendorCartStore((s) => s.shipping());
  const stamp = useVendorCartStore((s) => s.stamp());
  const total = useVendorCartStore((s) => s.total());
  const clearCart = useVendorCartStore((s) => s.clear);

  const [paymentMethod, setPaymentMethod] = useState<string>("");

  // ── Passager ──────────────────────────────────────────────────────────────
  const [typeClient, setTypeClient] = useState<"B2C" | "B2B">("B2C");
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [cin, setCin] = useState("");
  const [nomSociete, setNomSociete] = useState("");
  const [matriculeFiscal, setMatriculeFiscal] = useState("");
  const [registreCommerce, setRegistreCommerce] = useState("");
  const [numeroTVA, setNumeroTVA] = useState("");

  // Adresse — gouvernorat + délégation en SELECT
  const [gouvernoratId, setGouvernoratId] = useState<number>(22); // Tunis par défaut
  const [delegation, setDelegation] = useState<string>("");
  const [adresse, setAdresse] = useState("");
  const [adresseComplementaire, setAdresseComplementaire] = useState("");
  const [codePostal, setCodePostal] = useState("");

  const delegQuery = useQuery({
    queryKey: ["vendeur-delegations", gouvernoratId],
    queryFn: () => getDelegations(gouvernoratId),
    staleTime: 5 * 60_000,
  });
  const delegations = delegQuery.data ?? [];

  // Reset délégation si gouvernorat change
  useEffect(() => { setDelegation(""); }, [gouvernoratId]);

  const contextQuery = useQuery({
    queryKey: ["vendeur-context"],
    queryFn: getVendeurContext,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!contextQuery.data || paymentMethod) return;
    const first = contextQuery.data.paymentMethods[0]?.code ?? "";
    if (first) setPaymentMethod(first);
  }, [contextQuery.data, paymentMethod]);

  const lines = useMemo(
    () => items.map((item) => ({ articleRef: item.arRef, qty: item.qty })),
    [items],
  );

  // ── Validation ─────────────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const e: string[] = [];
    if (typeClient === "B2C" && !nomComplet.trim()) e.push("Nom complet requis.");
    if (typeClient === "B2B" && !nomSociete.trim()) e.push("Nom de la société requis.");
    return e;
  }, [typeClient, nomComplet, nomSociete]);

  const canSubmit = items.length > 0 && paymentMethod.trim().length > 0 && errors.length === 0;

  // ── Mutation ───────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: async () => {
      const gouvernoratName = TUNISIA_GOUVERNORATS[gouvernoratId] ?? "";
      const passager: VendeurPassagerClientDto = {
        typeClient,
        nomComplet: nomComplet.trim() || undefined,
        telephone: telephone.trim() || undefined,
        cin: cin.trim() || undefined,
        nomSociete: nomSociete.trim() || undefined,
        matriculeFiscal: matriculeFiscal.trim() || undefined,
        registreCommerce: registreCommerce.trim() || undefined,
        numeroTVA: numeroTVA.trim() || undefined,
        gouvernorat: gouvernoratName || undefined,
        delegation: delegation.trim() || undefined,
        adresse: adresse.trim() || undefined,
        adresseComplementaire: adresseComplementaire.trim() || undefined,
        codePostal: codePostal.trim() || undefined,
      };
      return createVendeurOrder({ customerMode: "PASSAGER", clientUserId: null, passager, paymentMethod, lines });
    },
    onSuccess: (created) => { clearCart(); nav(`/vendeur/orders/${created.piece}`); },
  });

  // ── Panier vide ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl app-surface px-8 py-12 text-center space-y-4">
        <div className="text-4xl">🛒</div>
        <h1 className="text-2xl font-extrabold text-card-foreground">Panier vendeur vide</h1>
        <p className="text-sm text-muted-foreground">Ajoutez des produits avant de passer au checkout.</p>
        <Link to="/vendeur/articles">
          <Button type="button" variant="primary" className="h-11 rounded-2xl px-6">
            Retour catalogue vendeur
          </Button>
        </Link>
      </div>
    );
  }

  if (contextQuery.isPending) return <Loader label="Chargement du contexte vendeur…" />;

  if (contextQuery.isError || !contextQuery.data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
        <div className="app-surface px-6 py-6">
          <SectionTitle kicker="Espace vendeur" title="Checkout vendeur" />
          <p className="mt-2 text-sm text-muted-foreground">Profil vendeur non rattaché à un dépôt.</p>
        </div>
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5 text-sm text-rose-700">
          {getApiErrorMessage(contextQuery.error)}
        </div>
      </div>
    );
  }

  const ctx: VendeurContextResponseDto = contextQuery.data;
  const isB2B = typeClient === "B2B";

  // ─── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-6 pb-10">

      {/* En-tête */}
      <section className="app-surface px-6 py-6 md:px-7 md:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionTitle kicker="Espace vendeur" title="Checkout vendeur" />
            <p className="mt-1 text-sm text-muted-foreground">
              Remise fixée sur <strong>{ctx.modeRemise}</strong> · dépôt{" "}
              <strong>{ctx.depot.depotIntitule || `#${ctx.depot.depotNo}`}</strong>
            </p>
          </div>
          <Link to="/vendeur/cart">
            <Button type="button" variant="outline" className="h-11 rounded-2xl px-5">← Retour panier</Button>
          </Link>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">

        {/* ── Colonne principale ─────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-7">

          {/* Type client */}
          <section className="app-surface px-6 py-6 md:px-7 md:py-7 space-y-5">
            <SectionTitle kicker="Client" title="Client passager" />

            <div className="flex gap-3">
              {(["B2C", "B2B"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTypeClient(t)}
                  className={["flex-1 rounded-2xl border-2 py-3 text-sm font-bold transition-all",
                    typeClient === t
                      ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/15"
                      : "border-border/60 bg-[hsl(var(--input))] text-card-foreground hover:border-primary/30"].join(" ")}>
                  {t === "B2C" ? "👤 Particulier (B2C)" : "🏢 Entreprise (B2B)"}
                </button>
              ))}
            </div>

            {/* Champs identité */}
            <div className="grid gap-4 md:grid-cols-2">
              {!isB2B ? (
                <Field label="Nom complet" required>
                  <Input value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} placeholder="Prénom Nom" />
                </Field>
              ) : (
                <Field label="Nom de la société" required>
                  <Input value={nomSociete} onChange={(e) => setNomSociete(e.target.value)} placeholder="Raison sociale" />
                </Field>
              )}
              <Field label="Téléphone">
                <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Ex: 99 000 000" />
              </Field>
              {!isB2B && (
                <Field label="CIN">
                  <Input value={cin} onChange={(e) => setCin(e.target.value)} placeholder="Ex: 12345678" />
                </Field>
              )}
              {isB2B && (
                <>
                  <Field label="Matricule fiscal">
                    <Input value={matriculeFiscal} onChange={(e) => setMatriculeFiscal(e.target.value)} placeholder="Ex: 123456/A/M/000" />
                  </Field>
                  <Field label="Registre de commerce">
                    <Input value={registreCommerce} onChange={(e) => setRegistreCommerce(e.target.value)} />
                  </Field>
                  <Field label="Numéro TVA">
                    <Input value={numeroTVA} onChange={(e) => setNumeroTVA(e.target.value)} />
                  </Field>
                </>
              )}
            </div>

            {/* Erreurs */}
            {errors.length > 0 && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-700 space-y-0.5">
                {errors.map((e) => <div key={e}>• {e}</div>)}
              </div>
            )}
          </section>

          {/* Adresse */}
          <section className="app-surface px-6 py-6 md:px-7 md:py-7 space-y-4">
            <SectionTitle kicker="Adresse" title="Localisation (optionnelle)" />

            {/* Gouvernorat */}
            <Field label="Gouvernorat">
              <select className={SELECT_CLASS} value={gouvernoratId}
                onChange={(e) => setGouvernoratId(Number(e.target.value))}>
                {TUNISIA_GOUVERNORATS.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
            </Field>

            {/* Délégation */}
            <Field label="Délégation">
              {delegQuery.isLoading ? (
                <div className="flex h-11 items-center rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-muted-foreground">Chargement…</div>
              ) : (
                <select className={SELECT_CLASS} value={delegation} onChange={(e) => setDelegation(e.target.value)}>
                  <option value="">— Choisir une délégation —</option>
                  {delegations.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
            </Field>

            {/* Cohérence gouvernorat + délégation */}
            {gouvernoratId !== null && delegation && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-medium text-emerald-700">
                ✅ {TUNISIA_GOUVERNORATS[gouvernoratId]} · {delegation}
              </div>
            )}

            <Field label="Adresse">
              <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Ex: 12 Rue Habib Bourguiba" />
            </Field>
            <Field label="Complément d'adresse">
              <Input value={adresseComplementaire} onChange={(e) => setAdresseComplementaire(e.target.value)} placeholder="Appartement, étage, zone…" />
            </Field>
            <Field label="Code postal">
              <Input value={codePostal} onChange={(e) => setCodePostal(e.target.value)} placeholder="Ex: 1000" />
            </Field>
          </section>

          {/* Paiement */}
          <section className="app-surface px-6 py-6 md:px-7 md:py-7 space-y-4">
            <SectionTitle kicker="Paiement" title="Mode de règlement" />
            <div className="grid gap-3 sm:grid-cols-2">
              {ctx.paymentMethods.map((method) => {
                const sel = paymentMethod === method.code;
                return (
                  <button key={method.code} type="button" onClick={() => setPaymentMethod(method.code)}
                    className={["flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                      sel ? "border-primary bg-primary/5 ring-2 ring-primary/15 shadow-sm" : "border-border/60 bg-[hsl(var(--input))] hover:border-primary/30"].join(" ")}>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm shrink-0">
                      <PayIcon code={method.code} />
                    </span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{method.code}</div>
                      <div className="mt-0.5 font-bold text-card-foreground">{method.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Récapitulatif ─────────────────────────────────────────────────── */}
        <aside className="space-y-6 lg:col-span-5">
          <section className="app-surface px-6 py-6 space-y-5 sticky top-6">
            <SectionTitle kicker="Résumé" title="Commande vendeur" />

            {/* Contexte dépôt */}
            <div className="rounded-2xl border border-border bg-[hsl(var(--input))] px-4 py-4 text-sm space-y-2">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Remise</span>
                <span className="font-semibold text-card-foreground">{ctx.modeRemise}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Dépôt</span>
                <span className="text-right font-semibold text-card-foreground max-w-[200px]">
                  {ctx.depot.depotIntitule || `#${ctx.depot.depotNo}`}
                </span>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* Lignes articles */}
            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.arRef} className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-card-foreground">{item.arRef}</div>
                    <div className="text-xs text-muted-foreground">× {item.qty}</div>
                  </div>
                  <span className="shrink-0 font-semibold text-card-foreground">{money(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="h-px bg-border/60" />

            {/* Totaux */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Livraison</span><span>{money(shipping)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Timbre</span><span>{money(stamp)}</span></div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 flex items-center justify-between">
              <span className="font-bold text-card-foreground">Total</span>
              <span className="text-xl font-black tracking-tight text-primary">{money(total)}</span>
            </div>

            {mutation.isError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-700">
                {getApiErrorMessage(mutation.error)}
              </div>
            )}

            <Button type="button" variant="primary"
              className="h-13 w-full rounded-2xl text-base font-extrabold shadow-lg shadow-primary/20"
              disabled={!canSubmit || mutation.isPending}
              onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Création en cours…" : "Valider la commande"}
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
