import { useState } from "react";
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
      onSuccess: () => {
        toast.success("Adresse ajoutée");
        setShowForm(false);
      },
      onError: () => toast.error("Impossible d'ajouter (max 3 adresses ?)"),
    });
  };

  const handleUpdate = (payload: Parameters<typeof create.mutate>[0]) => {
    if (!editing) return;
    update.mutate(
      { id: editing.id, payload },
      {
        onSuccess: () => {
          toast.success("Adresse mise à jour");
          setEditing(null);
        },
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
        description="Gérez jusqu'à 3 adresses. Une seule peut être définie par défaut."
        actions={
          <Button type="button" variant="primary" onClick={() => { setShowForm(true); setEditing(null); }}>
            + Nouvelle adresse
          </Button>
        }
      />

      {showForm && (
        <section className="app-surface p-6">
          <h2 className="mb-4 text-lg font-extrabold">Nouvelle adresse</h2>
          <AddressForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            loading={create.isPending}
            submitLabel="Ajouter"
          />
        </section>
      )}

      {editing && (
        <section className="app-surface p-6">
          <h2 className="mb-4 text-lg font-extrabold">Modifier "{editing.label}"</h2>
          <AddressForm
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            loading={update.isPending}
            submitLabel="Mettre à jour"
          />
        </section>
      )}

      {isPending ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : addresses.length === 0 && !showForm ? (
        <EmptyView
          title="Aucune adresse enregistrée"
          description="Ajoutez votre première adresse pour faciliter vos commandes."
          iconPath="M12 11.5a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0 0 5z M12 22s8-7.58 8-13a8 8 0 1 0-16 0c0 5.42 8 13 8 13z"
          action={
            <Button onClick={() => setShowForm(true)} variant="primary">
              + Ajouter une adresse
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {addresses.map((a) => (
            <article
              key={a.id}
              className={[
                "app-surface p-5 transition",
                a.isDefault ? "ring-2 ring-primary/40" : "",
              ].join(" ")}
            >
              <header className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {a.label}
                  </div>
                  {a.isDefault && (
                    <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      Par défaut
                    </span>
                  )}
                </div>
              </header>

              <div className="space-y-1 text-sm text-card-foreground">
                <div>{a.adresse}</div>
                <div>
                  {a.ville}
                  {a.codePostal ? ` ${a.codePostal}` : ""}
                </div>
                <div className="text-muted-foreground">
                  {a.delegation ? `${a.delegation}, ` : ""}
                  {a.gouvernorat}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!a.isDefault && (
                  <Button type="button" variant="outline" onClick={() => handleSetDefault(a)}>
                    Définir par défaut
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => { setEditing(a); setShowForm(false); }}>
                  Modifier
                </Button>
                <Button type="button" variant="ghost" className="text-rose-600" onClick={() => handleDelete(a)}>
                  Supprimer
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
