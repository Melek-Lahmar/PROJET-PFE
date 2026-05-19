import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import type { AdminRole, UserAdminResponseDto } from "../types/adminUsers";
import { adminReplaceRoles } from "../api/adminUsersApi";

const ROLES: AdminRole[] = ["CLIENT", "VENDEUR", "CONFIRMATEUR", "LIVREUR", "SUPERVISEUR", "ADMIN"];

type Props = {
  open: boolean;
  user: UserAdminResponseDto | null;
  onClose: () => void;
};

export function AdminEditRolesModal({ open, user, onClose }: Props) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>(user?.roles ?? []);

  useMemo(() => {
    setSelected(user?.roles ?? []);
    return null;
  }, [user?.userId]);

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

  const toggle = (r: string) => {
    setSelected((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const canSave = !!user && selected.length > 0;

  const pillClass = (active: boolean) =>
    `h-11 rounded-2xl border px-3 text-sm font-bold transition ${
      active
        ? "border-primary bg-primary/10 text-primary ring-4 ring-primary/10"
        : "border-border bg-card text-card-foreground/90 shadow-sm hover:bg-muted/35"
    }`;

  return (
    <Modal
      open={open}
      title={`Rôles: ${user?.email ?? ""}`}
      onClose={() => {
        if (mut.isPending) return;
        onClose();
      }}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={mut.isPending} className="h-11 rounded-2xl px-5">
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => mut.mutate()}
            isLoading={mut.isPending}
            disabled={!canSave || mut.isPending}
            className="h-11 rounded-2xl px-6 font-bold shadow-lg shadow-primary/20"
          >
            Enregistrer
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-muted/35 px-4 py-3 text-sm text-card-foreground/90">
          Le backend remplace la liste complète des rôles. Sélectionnez au moins un rôle.
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {ROLES.map((r) => (
            <button key={r} type="button" onClick={() => toggle(r)} className={pillClass(selected.includes(r))}>
              {r}
            </button>
          ))}
        </div>

        {mut.isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm font-semibold text-rose-700">
            Erreur mise à jour des rôles.
          </div>
        )}
      </div>
    </Modal>
  );
}