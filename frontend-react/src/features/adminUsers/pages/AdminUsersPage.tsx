import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { adminListUsers } from "../api/adminUsersApi";
import { AdminCreateUserModal } from "../components/AdminCreateUserModal";
import { AdminEditRolesModal } from "../components/AdminEditRolesModal";
import type { UserAdminResponseDto } from "../types/adminUsers";
import { AdminSegmentedTabs, type SegmentedTab } from "../../admin/components/AdminSegmentedTabs";
import {
  EmptyView,
  PremiumHero,
} from "../../../shared/components/premium";

type RoleFilter = "ALL" | "CLIENT" | "VENDEUR" | "CONFIRMATEUR" | "LIVREUR" | "SUPERVISEUR" | "ADMIN";

const ROLE_TABS: Array<SegmentedTab<RoleFilter>> = [
  { key: "ALL", label: "All" },
  { key: "ADMIN", label: "Admin" },
  { key: "CLIENT", label: "Client" },
  { key: "VENDEUR", label: "Vendeur" },
  { key: "CONFIRMATEUR", label: "Confirmateur" },
  { key: "LIVREUR", label: "Livreur" },
  { key: "SUPERVISEUR", label: "Superviseur" },
];

function normalizeResponse(value: unknown): { items: UserAdminResponseDto[]; total: number } {
  if (Array.isArray(value)) {
    return {
      items: value as UserAdminResponseDto[],
      total: value.length,
    };
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    const itemsCandidate = record.items ?? record.data ?? record.results ?? record.value;
    const items = Array.isArray(itemsCandidate) ? (itemsCandidate as UserAdminResponseDto[]) : [];

    const totalCandidate = record.total ?? record.count ?? record.totalCount;
    const total =
      typeof totalCandidate === "number" && Number.isFinite(totalCandidate)
        ? totalCandidate
        : items.length;

    return { items, total };
  }

  return { items: [], total: 0 };
}

function RoleBadge({ role }: { role: string }) {
  const r = role.toUpperCase();
  const cls =
    r === "ADMIN"
      ? "badge-danger"
      : r === "CONFIRMATEUR"
        ? "badge-warning"
        : r === "LIVREUR"
          ? "badge-success"
          : r === "SUPERVISEUR"
            ? "badge-info"
            : r === "VENDEUR"
            ? "badge-info"
            : "badge-neutral";

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${cls}`}>
      {role}
    </span>
  );
}

function safe(value?: string | null) {
  return value && value.trim() ? value : "-";
}

export function AdminUsersPage() {
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editRolesOpen, setEditRolesOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAdminResponseDto | null>(null);

  const activeRole = role === "ALL" ? undefined : role;

  const q = useQuery({
    queryKey: ["admin-users", { skip, take, role: activeRole }],
    queryFn: () => adminListUsers({ skip, take, role: activeRole }),
  });

  const normalized = useMemo(() => normalizeResponse(q.data), [q.data]);

  const items = useMemo(() => {
    const list = normalized.items;
    const s = search.trim().toLowerCase();

    if (!s) return list;

    return list.filter((u) =>
      `${u.email} ${(u.roles ?? []).join(" ")} ${u.profile?.nomComplet ?? ""}`
        .toLowerCase()
        .includes(s)
    );
  }, [normalized.items, search]);

  const total = normalized.total;
  const canPrev = skip > 0;
  const canNext = skip + take < total;
  const page = Math.floor(skip / take) + 1;

  const selectClass =
    "h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm font-semibold text-card-foreground shadow-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

  if (q.isLoading) return <Loader label="Chargement des utilisateurs..." />;

  if (q.isError) {
    return (
      <div className="container-app space-y-6 py-8">
        <PremiumHero kicker="Administration" title="Gestion des rôles" />
        <EmptyView
          title="Erreur de chargement"
          description={getApiErrorMessage(q.error)}
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </div>
    );
  }

  return (
    <div className="container-app space-y-6 py-8">
      <PremiumHero
        kicker="Administration"
        title="Gestion des rôles"
        description="Créez des utilisateurs, attribuez les rôles et naviguez rapidement entre ADMIN, CLIENT, VENDEUR, CONFIRMATEUR, LIVREUR et SUPERVISEUR."
        actions={
          <>
            <span className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
              {total} utilisateur{total > 1 ? "s" : ""}
            </span>
            <Button
              type="button"
              variant="primary"
              className="px-5 font-bold"
              onClick={() => setCreateOpen(true)}
            >
              Créer utilisateur
            </Button>
          </>
        }
      />
      <section className="app-surface overflow-hidden p-0">
        <div className="space-y-5 px-7 py-6">
          <AdminSegmentedTabs
            tabs={ROLE_TABS}
            value={role}
            onChange={(value) => {
              setRole(value);
              setSkip(0);
            }}
          />

          <div className="grid gap-4 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <label className="mb-2 block app-kicker">Recherche</label>
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSkip(0);
                }}
                placeholder="Email, nom, rôle..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block app-kicker">Taille page</label>
              <select
                className={selectClass}
                value={take}
                onChange={(e) => {
                  setSkip(0);
                  setTake(Number(e.target.value));
                }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={() => q.refetch()}
              >
                Actualiser
              </Button>
            </div>
          </div>
        </div>

        <div className="px-7 pb-7">
          <div className="table-shell overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-12 gap-3 table-head px-5 py-4">
                <div className="col-span-5">Utilisateur</div>
                <div className="col-span-3">Nom</div>
                <div className="col-span-3">Rôles</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {items.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Aucun utilisateur ne correspond au filtre actuel.
                </div>
              ) : (
                <div>
                  {items.map((u) => (
                    <div
                      key={u.userId}
                      className="grid grid-cols-12 items-start gap-3 border-t border-border/60 px-5 py-4 transition-colors hover:bg-accent/45"
                    >
                      <div className="col-span-5 min-w-0">
                        <div className="truncate text-sm font-bold text-card-foreground">
                          {safe(u.email)}
                        </div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {u.userId}
                        </div>
                      </div>

                      <div className="col-span-3 min-w-0">
                        <div className="truncate text-sm font-semibold text-card-foreground">
                          {safe(u.profile?.nomComplet)}
                        </div>
                      </div>

                      <div className="col-span-3 flex flex-wrap gap-1.5">
                        {(u.roles ?? []).length === 0 ? (
                          <RoleBadge role="-" />
                        ) : (
                          (u.roles ?? []).map((r) => <RoleBadge key={r} role={r} />)
                        )}
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="px-3"
                          onClick={() => {
                            setSelectedUser(u);
                            setEditRolesOpen(true);
                          }}
                        >
                          Rôles
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Page <span className="font-bold text-card-foreground">{page}</span> • Affichés{" "}
              <span className="font-bold text-card-foreground">{items.length}</span> /{" "}
              <span className="font-bold text-card-foreground">{total}</span>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!canPrev}
                onClick={() => setSkip((s) => Math.max(0, s - take))}
              >
                Précédent
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!canNext}
                onClick={() => setSkip((s) => s + take)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </div>
      </section>

      <AdminCreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <AdminEditRolesModal
        open={editRolesOpen}
        user={selectedUser}
        onClose={() => {
          setEditRolesOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
}