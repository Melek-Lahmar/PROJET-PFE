import { useEffect, useState } from "react";
import { useAddresses, useCreateAddress } from "../hooks/useAddresses";
import { AddressForm } from "./AddressForm";
import { Button } from "../../../shared/components/Button";
import type { ClientAddress } from "../types";

type Props = {
  selectedId?: string | null;
  onChange: (address: ClientAddress | null) => void;
};

/**
 * Sélecteur d'adresse pour le tunnel de commande.
 * - Charge les adresses du client
 * - Sélectionne par défaut la `IsDefault` (si aucune sélection)
 * - Permet d'ajouter une nouvelle adresse à la volée
 */
export function AddressPicker({ selectedId, onChange }: Props) {
  const { data: addresses = [], isPending } = useAddresses();
  const create = useCreateAddress();
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (selectedId) return;
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    if (def) onChange(def);
  }, [addresses, selectedId, onChange]);

  if (isPending) return <div className="text-sm text-muted-foreground">Chargement des adresses...</div>;

  return (
    <div className="space-y-3">
      {addresses.length === 0 && !showAddForm && (
        <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Aucune adresse enregistrée. Ajoutez-en une.
        </div>
      )}

      <div className="grid gap-2">
        {addresses.map((a) => {
          const selected = a.id === selectedId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a)}
              className={[
                "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
                selected
                  ? "border-primary/60 bg-primary/5 ring-2 ring-primary/30"
                  : "border-border bg-card hover:border-primary/30",
              ].join(" ")}
            >
              <span
                className={[
                  "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-primary" : "border-muted-foreground/40",
                ].join(" ")}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <strong className="text-card-foreground">{a.label}</strong>
                  {a.isDefault && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      Par défaut
                    </span>
                  )}
                </div>
                <div className="text-sm text-card-foreground">{a.adresse}</div>
                <div className="text-xs text-muted-foreground">
                  {a.ville}{a.codePostal ? ` ${a.codePostal}` : ""}{" — "}{a.gouvernorat}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {!showAddForm ? (
        <Button type="button" variant="outline" onClick={() => setShowAddForm(true)}>
          + Nouvelle adresse
        </Button>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <AddressForm
            onSubmit={(payload) => {
              create.mutate(payload, {
                onSuccess: (addr) => {
                  setShowAddForm(false);
                  onChange(addr);
                },
              });
            }}
            onCancel={() => setShowAddForm(false)}
            loading={create.isPending}
            submitLabel="Utiliser cette adresse"
          />
        </div>
      )}
    </div>
  );
}
