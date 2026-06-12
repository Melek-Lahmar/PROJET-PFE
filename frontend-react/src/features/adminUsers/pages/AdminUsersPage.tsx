import { useMemo, useState } from "react";
import type { SVGProps } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Loader } from "../../../shared/components/Loader";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { adminListUsers, adminUpdateUserProfile } from "../api/adminUsersApi";
import { AdminCreateUserModal } from "../components/AdminCreateUserModal";
import { AdminEditRolesModal } from "../components/AdminEditRolesModal";
import type { UserAdminResponseDto } from "../types/adminUsers";
import { EmptyView } from "../../../shared/components/premium";
import { getDepots } from "../../catalog/api/depotsApi";

type RoleFilter = "ALL" | "CLIENT" | "VENDEUR" | "CONFIRMATEUR" | "LIVREUR" | "SUPERVISEUR" | "ADMIN";

const ROLE_TABS: Array<{ key: RoleFilter; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "ADMIN", label: "Admin" },
  { key: "CLIENT", label: "Client" },
  { key: "VENDEUR", label: "Vendeur" },
  { key: "CONFIRMATEUR", label: "Confirmateur" },
  { key: "LIVREUR", label: "Livreur" },
  { key: "SUPERVISEUR", label: "Superviseur" },
];

function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconRefresh(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M21 12a9 9 0 0 1-15.1 6.63" />
      <path d="M3 12A9 9 0 0 1 18.1 5.37" />
      <path d="M18 2v4h-4" />
      <path d="M6 22v-4h4" />
    </svg>
  );
}

function IconShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3 20 7v5c0 5-3.2 8.4-8 9-4.8-.6-8-4-8-9V7l8-4Z" />
      <path d="M9.5 12.2 11.2 14l3.5-4" />
    </svg>
  );
}

function HeroArt() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden lg:block" aria-hidden="true">
      <div className="absolute -right-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-blue-200/55 blur-3xl dark:bg-blue-500/16" />
      <div className="absolute right-12 top-10 h-52 w-52 rounded-full bg-violet-200/55 blur-3xl dark:bg-violet-500/16" />
      <div className="absolute right-6 top-1/2 h-56 w-[24rem] -translate-y-1/2 rotate-[-12deg] rounded-[3rem] border border-blue-200/70 bg-gradient-to-br from-blue-50/90 via-white/65 to-violet-100/75 shadow-[0_28px_70px_-48px_rgba(37,99,235,0.8)] dark:border-blue-400/15 dark:from-blue-500/10 dark:via-slate-900/20 dark:to-violet-500/12" />
      <div className="absolute right-20 top-16 h-20 w-44 rotate-[-12deg] rounded-2xl border border-white/70 bg-white/70 shadow-sm dark:border-white/10 dark:bg-slate-950/45" />
      <div className="absolute right-36 bottom-12 h-16 w-32 rotate-[-12deg] rounded-2xl border border-white/70 bg-white/60 shadow-sm dark:border-white/10 dark:bg-slate-950/35" />
      <div className="absolute right-28 top-24 h-2 w-28 rotate-[-12deg] rounded-full bg-blue-300/70 dark:bg-blue-300/25" />
      <div className="absolute right-28 top-32 h-2 w-20 rotate-[-12deg] rounded-full bg-violet-300/60 dark:bg-violet-300/25" />
      <div className="absolute right-48 bottom-20 h-2 w-16 rotate-[-12deg] rounded-full bg-blue-300/65 dark:bg-blue-300/25" />
    </div>
  );
}

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

function roleBadgeClass(role: string) {
  const r = role.toUpperCase();

  if (r === "ADMIN") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/12 dark:text-rose-200";
  }
  if (r === "CONFIRMATEUR") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/12 dark:text-amber-200";
  }
  if (r === "LIVREUR") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/12 dark:text-emerald-200";
  }
  if (r === "SUPERVISEUR") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-500/12 dark:text-indigo-200";
  }
  if (r === "VENDEUR") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/12 dark:text-blue-200";
  }

  return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300";
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${roleBadgeClass(role)}`}>
      {role}
    </span>
  );
}

function safe(value?: string | null) {
  return value && value.trim() ? value : "-";
}

function getInitials(user: UserAdminResponseDto) {
  const name = user.profile?.nomComplet?.trim();
  const source = name || user.email || user.userId || "?";
  const parts = source.split(/[\s._@-]+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return initials || "?";
}

function SetDepotModal({
  user,
  onClose,
}: {
  user: UserAdminResponseDto;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState(user.profile?.codeDepot ?? "");

  const { data: depots = [], isLoading: depotsLoading } = useQuery({
    queryKey: ["depots-list"],
    queryFn: () => getDepots(),
    staleTime: 5 * 60_000,
  });

  const mut = useMutation({
    mutationFn: () => adminUpdateUserProfile(user.userId, { codeDepot: value }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); onClose(); },
  });

  const selectedDepot = depots.find((d) => String(d.dE_No) === value || d.dE_Code === value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-base font-black text-card-foreground">Configurer le dépôt vendeur</h2>
        <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Sélectionnez le dépôt (gouvernorat) rattaché à ce vendeur.
        </p>

        {depotsLoading ? (
          <div className="mt-3 flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : depots.length === 0 ? (
          <p className="mt-3 text-sm text-destructive">Aucun dépôt trouvé. Synchronisez d'abord les dépôts depuis Sage.</p>
        ) : (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoFocus
          >
            <option value="">— Aucun dépôt —</option>
            {depots.map((d) => (
              <option key={d.dE_No} value={String(d.dE_No)}>
                {d.dE_Intitule || d.dE_Code}
                {d.dE_Ville ? ` — ${d.dE_Ville}` : ""}
              </option>
            ))}
          </select>
        )}

        {selectedDepot && (
          <div className="mt-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="font-semibold text-card-foreground">Dépôt #{selectedDepot.dE_No}</span>
            {" · "}
            {selectedDepot.dE_Code}
            {selectedDepot.dE_Adresse ? ` · ${selectedDepot.dE_Adresse}` : ""}
          </div>
        )}

        {mut.isError && (
          <p className="mt-2 text-xs text-destructive">{getApiErrorMessage(mut.error)}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
            Annuler
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || depotsLoading}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mut.isPending ? "Sauvegarde..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editRolesOpen, setEditRolesOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAdminResponseDto | null>(null);
  const [depotUser, setDepotUser] = useState<UserAdminResponseDto | null>(null);

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
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600";

  if (q.isLoading) return <Loader label="Chargement des utilisateurs..." />;

  if (q.isError) {
    return (
      <div className="space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Administration &gt; Utilisateurs</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-slate-50">Gestion des rôles</h1>
        </section>
        <EmptyView
          title="Erreur de chargement"
          description={getApiErrorMessage(q.error)}
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_24px_70px_-46px_rgba(2,6,23,0.9)] sm:px-8 sm:py-9">
        <HeroArt />
        <div className="relative z-10 max-w-3xl">
          <nav className="flex items-center gap-2 text-[11px] font-black uppercase text-slate-500 dark:text-slate-400" aria-label="Fil d'Ariane">
            <span>Administration</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span>Utilisateurs</span>
          </nav>

          <div className="mt-5 space-y-3">
            <h1 className="text-3xl font-black text-slate-950 dark:text-slate-50 sm:text-4xl">
              Gestion des rôles
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400 sm:text-[15px]">
              Créez des utilisateurs, attribuez les rôles et naviguez rapidement entre ADMIN, CLIENT, VENDEUR, CONFIRMATEUR, LIVREUR et SUPERVISEUR.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
              {total} utilisateur{total > 1 ? "s" : ""}
            </span>
            <Button
              type="button"
              variant="primary"
              className="h-11 rounded-xl px-5 font-bold"
              onClick={() => setCreateOpen(true)}
            >
              <IconPlus className="h-4 w-4" />
              Créer utilisateur
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_24px_70px_-54px_rgba(15,23,42,0.55)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_24px_70px_-48px_rgba(2,6,23,0.92)]">
        <div className="space-y-5 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
          <div className="flex flex-wrap gap-2" aria-label="Filtres par rôle">
            {ROLE_TABS.map((tab) => {
              const active = tab.key === role;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setRole(tab.key);
                    setSkip(0);
                  }}
                  className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15 ${
                    active
                      ? "border-blue-600 bg-blue-600 text-white shadow-[0_14px_32px_-20px_rgba(37,99,235,0.9)] dark:border-blue-500 dark:bg-blue-500"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-500/35 dark:hover:bg-blue-500/10 dark:hover:text-blue-200"
                  }`}
                  aria-pressed={active}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <label htmlFor="admin-users-search" className="mb-2 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                Recherche
              </label>
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  id="admin-users-search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSkip(0);
                  }}
                  placeholder="Email, nom, rôle..."
                  className="rounded-xl border-slate-200 bg-white pl-10 text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[auto_auto] sm:items-end">
              <div>
                <label htmlFor="admin-users-page-size" className="mb-2 block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                  Taille page
                </label>
                <select
                  id="admin-users-page-size"
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

              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-slate-200 bg-white px-4 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-500/35 dark:hover:bg-blue-500/10 dark:hover:text-blue-200"
                onClick={() => q.refetch()}
              >
                <IconRefresh className="h-4 w-4" />
                Actualiser
              </Button>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-[860px] w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 dark:bg-slate-950/65 dark:text-slate-400">
                  <th scope="col" className="px-5 py-4">Utilisateur</th>
                  <th scope="col" className="px-5 py-4">Nom</th>
                  <th scope="col" className="px-5 py-4">Rôle</th>
                  <th scope="col" className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                      Aucun utilisateur ne correspond au filtre actuel.
                    </td>
                  </tr>
                ) : (
                  items.map((u) => (
                    <tr
                      key={u.userId}
                      className="transition-colors hover:bg-muted/80 dark:hover:bg-slate-800/35"
                    >
                      <td className="px-5 py-4 align-middle">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-black text-white shadow-[0_12px_24px_-18px_rgba(37,99,235,0.9)]">
                            {getInitials(u)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-950 dark:text-slate-50">
                              {safe(u.email)}
                            </div>
                            <div className="truncate font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {u.userId}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="max-w-[220px] truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {safe(u.profile?.nomComplet)}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="flex flex-wrap gap-1.5">
                          {(u.roles ?? []).length === 0 ? (
                            <RoleBadge role="-" />
                          ) : (
                            (u.roles ?? []).map((r) => <RoleBadge key={r} role={r} />)
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="flex justify-end gap-2">
                          {u.roles?.includes("VENDEUR") && (
                            <button
                              type="button"
                              title={`Dépôt: ${u.profile?.codeDepot ?? "non configuré"}`}
                              onClick={() => setDepotUser(u)}
                              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                                u.profile?.codeDepot
                                  ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400"
                                  : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400"
                              }`}
                            >
                              {u.profile?.codeDepot ? `Dépôt: ${u.profile.codeDepot}` : "⚠ Dépôt"}
                            </button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-slate-200 bg-white px-3 font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-500/35 dark:hover:bg-blue-500/10 dark:hover:text-blue-200"
                            onClick={() => {
                              setSelectedUser(u);
                              setEditRolesOpen(true);
                            }}
                          >
                            <IconShield className="h-4 w-4" />
                            Rôles
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Affichage <span className="font-black text-slate-950 dark:text-slate-50">{items.length}</span> /{" "}
              <span className="font-black text-slate-950 dark:text-slate-50">{total}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white px-4 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                disabled={!canPrev}
                onClick={() => setSkip((s) => Math.max(0, s - take))}
              >
                Précédent
              </Button>

              <span
                className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-blue-600 px-3 text-sm font-black text-white shadow-[0_14px_30px_-20px_rgba(37,99,235,0.9)]"
                aria-current="page"
              >
                {page}
              </span>

              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white px-4 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
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

      {depotUser && (
        <SetDepotModal user={depotUser} onClose={() => setDepotUser(null)} />
      )}
    </div>
  );
}
