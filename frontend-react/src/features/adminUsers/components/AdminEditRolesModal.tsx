import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../shared/components/Button";
import type { AdminRole, UserAdminResponseDto } from "../types/adminUsers";
import { adminReplaceRoles } from "../api/adminUsersApi";

const ROLES: AdminRole[] = ["CLIENT", "VENDEUR", "CONFIRMATEUR", "LIVREUR", "SUPERVISEUR", "ADMIN"];

const ROLE_META: Record<AdminRole, { label: string; hint: string; className: string; dotClassName: string }> = {
  CLIENT: {
    label: "Client",
    hint: "Accès boutique et commandes",
    className: "border-slate-200 bg-slate-50/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/55 dark:text-slate-200",
    dotClassName: "bg-slate-500",
  },
  VENDEUR: {
    label: "Vendeur",
    hint: "Vente et panier vendeur",
    className: "border-blue-200 bg-blue-50/85 text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/12 dark:text-blue-200",
    dotClassName: "bg-blue-500",
  },
  CONFIRMATEUR: {
    label: "Confirmateur",
    hint: "Validation des commandes",
    className: "border-amber-200 bg-amber-50/90 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/12 dark:text-amber-200",
    dotClassName: "bg-amber-500",
  },
  LIVREUR: {
    label: "Livreur",
    hint: "Livraison et bons BL",
    className: "border-emerald-200 bg-emerald-50/90 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/12 dark:text-emerald-200",
    dotClassName: "bg-emerald-500",
  },
  SUPERVISEUR: {
    label: "Superviseur",
    hint: "Zones et supervision",
    className: "border-indigo-200 bg-indigo-50/90 text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-500/12 dark:text-indigo-200",
    dotClassName: "bg-indigo-500",
  },
  ADMIN: {
    label: "Admin",
    hint: "Administration complète",
    className: "border-rose-200 bg-rose-50/90 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/12 dark:text-rose-200",
    dotClassName: "bg-rose-500",
  },
};

type Props = {
  open: boolean;
  user: UserAdminResponseDto | null;
  onClose: () => void;
};

export function AdminEditRolesModal({ open, user, onClose }: Props) {
  if (!open) return null;

  return <AdminEditRolesModalContent key={user?.userId ?? "empty"} user={user} onClose={onClose} />;
}

function AdminEditRolesModalContent({ user, onClose }: Omit<Props, "open">) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>(user?.roles ?? []);

  const mut = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await adminReplaceRoles(user.userId, selected);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      onClose();
    },
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mut.isPending) onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, mut.isPending]);

  const toggle = (r: string) => {
    setSelected((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const canSave = !!user && selected.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-md transition dark:bg-slate-950/72"
        onClick={() => {
          if (mut.isPending) return;
          onClose();
        }}
        aria-label="Fermer la fenêtre"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-roles-title"
        className="relative w-full max-w-[min(94vw,760px)] overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-950 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.85)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:shadow-[0_40px_120px_-46px_rgba(2,6,23,0.95)]"
      >
        <div className="relative overflow-hidden border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:px-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-blue-200/60 blur-3xl dark:bg-blue-500/16" />
          <div className="pointer-events-none absolute right-16 top-10 h-32 w-32 rounded-full bg-violet-200/50 blur-3xl dark:bg-violet-500/14" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                Gestion des permissions
              </p>
              <h2 id="admin-edit-roles-title" className="mt-2 truncate text-xl font-black text-slate-950 dark:text-slate-50">
                Rôles utilisateur
              </h2>
              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                <span className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  {user?.email ?? "Utilisateur"}
                </span>
                <span className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-black text-white shadow-[0_14px_28px_-20px_rgba(37,99,235,0.9)]">
                  {selected.length} sélectionné{selected.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-500/35 dark:hover:bg-blue-500/10 dark:hover:text-blue-200"
              onClick={() => {
                if (mut.isPending) return;
                onClose();
              }}
              aria-label="Fermer"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-6 py-5 sm:px-7">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm font-semibold leading-6 text-blue-900 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-100">
            Le backend remplace la liste complète des rôles. Sélectionnez au moins un rôle avant d'enregistrer.
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => {
              const active = selected.includes(r);
              const meta = ROLE_META[r];

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggle(r)}
                  className={`group relative min-h-[96px] rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15 ${
                    active
                      ? `${meta.className} shadow-[0_18px_42px_-32px_rgba(37,99,235,0.9)] ring-2 ring-blue-500/35`
                      : "border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-500/35 dark:hover:bg-slate-900"
                  }`}
                  aria-pressed={active}
                >
                  <span className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-xl ${active ? "bg-white/70 dark:bg-slate-950/45" : "bg-slate-100 dark:bg-slate-800"}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClassName}`} />
                  </span>
                  <span className="block text-sm font-black uppercase">{r}</span>
                  <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">{meta.hint}</span>
                  <span
                    className={`absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${
                      active
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-transparent group-hover:text-slate-300 dark:border-slate-700 dark:bg-slate-950"
                    }`}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>

          {mut.isError && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm font-semibold text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/12 dark:text-rose-200">
              Erreur mise à jour des rôles.
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/75 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/55 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Les modifications seront appliquées après confirmation.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mut.isPending}
              className="h-11 rounded-xl border-slate-200 bg-white px-5 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => mut.mutate()}
              isLoading={mut.isPending}
              disabled={!canSave || mut.isPending}
              className="h-11 rounded-xl px-6 font-bold shadow-[0_18px_40px_-24px_rgba(37,99,235,0.95)]"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
