// src/features/addresses/pages/ProfileAddressesPage.tsx
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateAddress,
} from "../hooks/useAddresses";
import { AddressForm } from "../components/AddressForm";
import { Button } from "../../../shared/components/Button";
import { useToast } from "../../../shared/components/premium/Toast";
import { PremiumHero, EmptyView } from "../../../shared/components/premium";
import type { ClientAddress } from "../types";

export function ProfileAddressesPage() {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/checkout";
  const fromCheckout = searchParams.get("returnTo") === "/checkout" || !searchParams.get("returnTo");

  const { data: addresses = [], isPending } = useAddresses();
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const remove = useDeleteAddress();
  const setDefault = useSetDefaultAddress();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ClientAddress | null>(null);

  const handleAdd = (payload: Parameters<typeof create.mutate>[0]) => {
    create.mutate(payload, {
      onSuccess: () => { toast.success("Adresse ajoutée"); setShowForm(false); },
      onError: () => toast.error("Impossible d'ajouter (max 4 adresses ?)"),
    });
  };

  const handleUpdate = (payload: Parameters<typeof create.mutate>[0]) => {
    if (!editing) return;
    update.mutate(
      { id: editing.id, payload },
      {
        onSuccess: () => { toast.success("Adresse mise à jour"); setEditing(null); },
        onError: () => toast.error("Mise à jour impossible"),
      },
    );
  };

  const handleDelete = (a: ClientAddress) => {
    if (!confirm(`Supprimer l'adresse "${a.label}" ?`)) return;
    remove.mutate(a.id, {
      onSuccess: () => toast.success("Adresse supprimée"),
      onError: () => toast.error("Suppression impossible"),
    });
  };

  const handleSetDefault = (a: ClientAddress) => {
    if (a.isDefault) return;
    setDefault.mutate(a.id, {
      onSuccess: () => toast.success("Définie par défaut"),
      onError: () => toast.error("Action impossible"),
    });
  };

  return (
    <div className="w-full space-y-6 pb-10">
      <PremiumHero
        kicker="Profil"
        title="Mes adresses de livraison"
        description="Gérez vos adresses enregistrées. Une seule peut être définie par défaut."
        actions={
          <div className="flex flex-wrap gap-3">
            {/* Bouton retour checkout */}
            <Link to={returnTo}>
              <Button type="button" variant="outline" className="h-11 rounded-2xl px-5">
                {fromCheckout ? "← Retour au checkout" : "← Retour"}
              </Button>
            </Link>

            {/* Ajouter adresse */}
            {!showForm && (
              <Button
                type="button"
                variant="primary"
                className="h-11 rounded-2xl px-5"
                onClick={() => { setShowForm(true); setEditing(null); }}
              >
                + Nouvelle adresse
              </Button>
            )}
          </div>
        }
      />

      {/* Formulaire ajout */}
      {showForm && (
        <section className="app-surface p-6 rounded-3xl">
          <h2 className="mb-4 text-lg font-extrabold text-card-foreground">Nouvelle adresse</h2>
          <AddressForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            loading={create.isPending}
            submitLabel="Ajouter"
          />
        </section>
      )}

      {/* Formulaire édition */}
      {editing && (
        <section className="app-surface p-6 rounded-3xl">
          <h2 className="mb-4 text-lg font-extrabold text-card-foreground">Modifier « {editing.label} »</h2>
          <AddressForm
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={update.isPending}
            submitLabel="Mettre à jour"
          />
        </section>
      )}

      {/* Liste */}
      {isPending ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : addresses.length === 0 && !showForm ? (
        <EmptyView
          title="Aucune adresse enregistrée"
          description="Ajoutez votre première adresse pour faciliter vos commandes."
          iconPath="M12 11.5a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0 0 5z M12 22s8-7.58 8-13a8 8 0 1 0-16 0c0 5.42 8 13 8 13z"
          action={
            <Button onClick={() => setShowForm(true)} variant="primary" className="h-11 rounded-2xl px-5">
              + Ajouter une adresse
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {addresses.map((a) => (
            <article
              key={a.id}
              className={["app-surface p-5 transition-all", a.isDefault ? "ring-2 ring-primary/40" : ""].join(" ")}
            >
              <header className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{a.label}</div>
                  {a.isDefault && (
                    <span className="mt-1 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      Par défaut
                    </span>
                  )}
                </div>
                {a.latitude && a.longitude && (
                  <span className="inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                    📍 GPS
                  </span>
                )}
              </header>

              <div className="space-y-1 text-sm text-card-foreground">
                <div className="font-medium">{a.adresse}</div>
                <div className="text-muted-foreground">
                  {a.ville}{a.codePostal ? ` ${a.codePostal}` : ""}
                </div>
                {a.delegation && (
                  <div className="text-xs text-muted-foreground">
                    {a.delegation}{a.gouvernorat ? ` · ${a.gouvernorat}` : ""}
                  </div>
                )}
              </div>

              <footer className="mt-4 flex flex-wrap gap-2">
                {!a.isDefault && (
                  <Button
                    type="button" variant="ghost" size="sm"
                    className="h-8 rounded-xl px-3 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => handleSetDefault(a)}
                    disabled={setDefault.isPending}
                  >
                    ☆ Définir par défaut
                  </Button>
                )}
                <Button
                  type="button" variant="ghost" size="sm"
                  className="h-8 rounded-xl px-3 text-xs"
                  onClick={() => { setEditing(a); setShowForm(false); }}
                >
                  Modifier
                </Button>
                <Button
                  type="button" variant="ghost" size="sm"
                  className="h-8 rounded-xl px-3 text-xs text-danger hover:bg-danger/10"
                  onClick={() => handleDelete(a)}
                  disabled={remove.isPending}
                >
                  Supprimer
                </Button>
              </footer>
            </article>
          ))}
        </div>
      )}

      {/* Tip retour checkout */}
      {addresses.length > 0 && fromCheckout && (
        <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-card-foreground">
          💡 Retournez au checkout pour utiliser vos adresses enregistrées directement dans votre commande.{" "}
          <Link to={returnTo} className="font-semibold text-primary hover:underline underline-offset-2">
            Retour au checkout →
          </Link>
        </div>
      )}
    </div>
  );
}
