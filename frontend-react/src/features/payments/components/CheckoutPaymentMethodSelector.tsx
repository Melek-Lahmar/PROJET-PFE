import type { CheckoutPaymentMethod } from "../types/konnectPayment";

type Props = {
  value: CheckoutPaymentMethod;
  onChange: (value: CheckoutPaymentMethod) => void;
  total: number;
};

type PaymentOption = {
  value: CheckoutPaymentMethod;
  icon: string;
  title: string;
  subtitle: string;
  chips: string[];
  accentClassName: string;
};

const paymentOptions: PaymentOption[] = [
  {
    value: "COD",
    icon: "💵",
    title: "Paiement à la livraison",
    subtitle: "Le flux actuel reste inchangé. La commande est créée immédiatement et le règlement se fait hors ligne.",
    chips: ["Flux actuel conservé", "Aucune redirection", "Zéro régression"],
    accentClassName: "from-emerald-500/15 to-emerald-500/5",
  },
  {
    value: "VIRTUAL",
    icon: "🔐",
    title: "Paiement virtuel sécurisé",
    subtitle:
      "Simulation réaliste d’un paiement en ligne avec carte virtuelle. Aucune transaction bancaire réelle n’est effectuée.",
    chips: ["Sandbox sécurisé", "Carte virtuelle", "Statut backend réel"],
    accentClassName: "from-primary/15 to-indigo-500/10",
  },
];

function money(value: number) {
  return `${value.toFixed(3)} TND`;
}

export function CheckoutPaymentMethodSelector({ value, onChange, total }: Props) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Mode de paiement
      </label>

      <div className="grid gap-3 xl:grid-cols-2">
        {paymentOptions.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`group relative overflow-hidden rounded-[24px] border-2 p-5 text-left transition-all duration-200 active:scale-[0.98] ${
                selected
                  ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-sm"
                  : "border-border/60 bg-[hsl(var(--input))] hover:border-primary/25 hover:bg-accent/45"
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${option.accentClassName} opacity-90`} />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/50 bg-white/80 text-2xl shadow-sm">
                    {option.icon}
                  </div>

                  <span
                    className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold uppercase tracking-[0.16em] ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground ring-1 ring-border"
                    }`}
                  >
                    {selected ? "Sélectionné" : "Choisir"}
                  </span>
                </div>

                <div className="mt-5">
                  <div className="text-base font-black tracking-tight text-card-foreground">
                    {option.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {option.subtitle}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {option.chips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex rounded-full border border-border/70 bg-card/75 px-3 py-1 text-[11px] font-semibold text-muted-foreground"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {value === "COD" ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
          Le comportement actuel est conservé : la commande sera créée immédiatement, puis l’utilisateur sera redirigé vers son récapitulatif.
        </div>
      ) : (
        <div className="space-y-3 rounded-[22px] border border-primary/15 bg-primary/[0.05] p-4 text-sm text-card-foreground">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-bold">Paiement virtuel sécurisé actif</div>
              <p className="mt-1 max-w-2xl leading-6 text-muted-foreground">
                Le backend créera la commande, enregistrera une tentative dans B_PAIEMENT et redirigera vers une page de paiement de test.
              </p>
            </div>

            <div className="rounded-2xl border border-primary/15 bg-white/80 px-4 py-3 text-right shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Montant à transmettre
              </div>
              <div className="mt-1 text-lg font-black tracking-tight text-primary">{money(total)}</div>
            </div>
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-2">
              Référence virtuelle générée
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-2">
              Retour succès / échec / annulation
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-2">
              Lecture backend réelle
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
