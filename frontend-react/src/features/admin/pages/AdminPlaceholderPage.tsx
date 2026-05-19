import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminListPersonnel } from "../api/adminBackofficeApi";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { Button } from "../../../shared/components/Button";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import type { AdminPersonnelItem } from "../types/adminBackoffice";
import {
  EmptyView,
  PremiumHero,
} from "../../../shared/components/premium";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
}

function safe(value?: string | null) {
  return value && value.trim() ? value : "-";
}

function roleBadgeClass(role?: string | null) {
  const normalized = (role ?? "").toUpperCase();
  if (normalized === "ADMIN") return "badge-danger";
  if (normalized === "CONFIRMATEUR") return "badge-warning";
  if (normalized === "VENDEUR") return "badge-info";
  return "badge-neutral";
}

function matchesSearch(item: AdminPersonnelItem, term: string) {
  const haystack = [
    item.nomComplet,
    item.email,
    item.telephone,
    item.primaryRole,
    item.roles.join(" "),
    item.poste,
    item.departement,
    item.codeEmploye,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(term);
}

export function AdminPersonnelPage() {
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["admin-personnel"],
    queryFn: adminListPersonnel,
  });

  const items = useMemo(() => {
    const list = query.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((item) => matchesSearch(item, term));
  }, [query.data, search]);

  if (query.isLoading) return <Loader label="Chargement du personnel..." />;

  if (query.isError) {
    return (
      <div className="container-app space-y-6 py-8">
        <PremiumHero kicker="Administration" title="Gestion du personnel" />
        <EmptyView
          title="Erreur de chargement"
          description={getApiErrorMessage(query.error)}
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </div>
    );
  }

  return (
    <div className="container-app space-y-6 py-8">
      <PremiumHero
        kicker="Administration"
        title="Gestion du personnel"
        description="Liste dédiée aux profils internes ayant les rôles ADMIN, CONFIRMATEUR et VENDEUR. Les clients sont exclus de cette vue pour garder un back-office clair et séparé."
        actions={
          <span className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
            {items.length} membre{items.length > 1 ? "s" : ""}
          </span>
        }
      />

      <section className="app-surface overflow-hidden p-0">

        <div className="grid gap-4 px-7 py-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-2 block app-kicker">Recherche</label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, email, rôle, téléphone..."
            />
          </div>

          <div className="flex justify-start md:justify-end">
            <Button type="button" variant="outline" onClick={() => query.refetch()}>
              Actualiser
            </Button>
          </div>
        </div>

        <div className="px-7 pb-7">
          <div className="table-shell overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-12 gap-3 table-head px-5 py-4">
                <div className="col-span-3">Nom / prénom</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Rôle</div>
                <div className="col-span-2">Téléphone</div>
                <div className="col-span-1">État</div>
                <div className="col-span-1 text-right">Création</div>
              </div>

              {items.length === 0 ? (
                <div className="px-5 py-6">
                  <EmptyView
                    title="Aucun membre"
                    description="Aucun profil interne ne correspond aux critères actuels."
                    iconPath="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M22 11h-6 M19 8v6"
                  />
                </div>
              ) : (
                <div>
                  {items.map((item) => (
                    <div key={item.userId} className="grid grid-cols-12 items-start gap-3 border-t border-border/60 px-5 py-4 hover:bg-accent/45">
                      <div className="col-span-3 min-w-0">
                        <div className="truncate text-sm font-bold text-card-foreground">{safe(item.nomComplet)}</div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {safe(item.poste)} {item.departement ? `• ${item.departement}` : ""}
                        </div>
                      </div>
                      <div className="col-span-3 min-w-0">
                        <div className="truncate text-sm font-semibold text-card-foreground">{item.email}</div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">{safe(item.codeEmploye)}</div>
                      </div>
                      <div className="col-span-2 flex flex-wrap gap-1.5">
                        {item.roles.map((role) => (
                          <span key={`${item.userId}-${role}`} className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${roleBadgeClass(role)}`}>
                            {role}
                          </span>
                        ))}
                      </div>
                      <div className="col-span-2 text-sm text-card-foreground">{safe(item.telephone)}</div>
                      <div className="col-span-1">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${item.isActive ? "badge-success" : "badge-danger"}`}>
                          {item.isActive ? "Actif" : "Bloqué"}
                        </span>
                      </div>
                      <div className="col-span-1 text-right text-sm font-semibold text-card-foreground">{formatDate(item.dateCreation)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}