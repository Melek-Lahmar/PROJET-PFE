import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../../shared/components/Modal";
import { Input } from "../../../shared/components/Input";
import { Button } from "../../../shared/components/Button";
import { adminCreateUser } from "../api/adminUsersApi";
import type { AdminRole, CreateUserRequestDto } from "../types/adminUsers";
import { getDelegations, getGouvernorats } from "../../geo/api/geoApi";

type Props = {
  open: boolean;
  onClose: () => void;
};

const ROLES: AdminRole[] = ["CLIENT", "VENDEUR", "CONFIRMATEUR", "LIVREUR", "SUPERVISEUR", "ADMIN"];

export function AdminCreateUserModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("12345678");
  const [role, setRole] = useState<AdminRole>("LIVREUR");
  const [typeProfil, setTypeProfil] = useState<number>(1);
  const [typeClient, setTypeClient] = useState<number | null>(null);
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [cin, setCin] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [nomSociete, setNomSociete] = useState("");
  const [matriculeFiscal, setMatriculeFiscal] = useState("");
  const [gouvernorat, setGouvernorat] = useState<number>(22);
  const [delegation, setDelegation] = useState("");

  const gouvernoratsQuery = useQuery({
    queryKey: ["geo-gouvernorats"],
    queryFn: getGouvernorats,
    enabled: open,
  });

  const delegationsQuery = useQuery({
    queryKey: ["geo-delegations", gouvernorat],
    queryFn: () => getDelegations(gouvernorat),
    enabled: open && Number.isFinite(gouvernorat),
  });

  useEffect(() => {
    if (!open) return;
    if (role === "CLIENT") {
      setTypeProfil(0);
      setTypeClient(0);
    } else {
      setTypeProfil(1);
      setTypeClient(null);
    }
  }, [open, role]);

  useEffect(() => {
    const list = delegationsQuery.data ?? [];
    if (!delegation && list.length > 0) setDelegation(list[0]);
    if (list.length === 0) setDelegation("");
  }, [delegationsQuery.data, delegation]);

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (!password.trim()) return false;
    if (!telephone.trim()) return false;
    if (!delegation.trim()) return false;
    if (role === "CLIENT") {
      if (typeClient === null) return false;
      if (typeClient === 1) {
        if (!nomSociete.trim()) return false;
        if (!matriculeFiscal.trim()) return false;
      }
    }
    return true;
  }, [email, password, telephone, delegation, role, typeClient, nomSociete, matriculeFiscal]);

  const mut = useMutation({
    mutationFn: async () => {
      const dto: CreateUserRequestDto = {
        email: email.trim(),
        password,
        role,
        typeProfil,
        typeClient,
        nomComplet: nomComplet.trim() ? nomComplet.trim() : null,
        telephone: telephone.trim() ? telephone.trim() : null,
        cin: cin.trim() ? cin.trim() : null,
        dateNaissance: dateNaissance ? dateNaissance : null,
        gouvernorat,
        delegation,
        nomSociete: role === "CLIENT" && typeClient === 1 ? (nomSociete.trim() ? nomSociete.trim() : null) : null,
        matriculeFiscal:
          role === "CLIENT" && typeClient === 1 ? (matriculeFiscal.trim() ? matriculeFiscal.trim() : null) : null,
      };
      return adminCreateUser(dto);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      onClose();
      setEmail("");
      setPassword("12345678");
      setRole("LIVREUR");
      setNomComplet("");
      setTelephone("");
      setCin("");
      setDateNaissance("");
      setNomSociete("");
      setMatriculeFiscal("");
      setGouvernorat(22);
      setDelegation("");
    },
  });

  const selectClass =
    "h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-card-foreground shadow-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

  return (
    <Modal
      open={open}
      title="Créer un utilisateur"
      onClose={() => {
        if (mut.isPending) return;
        onClose();
      }}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={mut.isPending} className="h-11 rounded-2xl px-5">
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => mut.mutate()}
            isLoading={mut.isPending}
            disabled={!canSubmit || mut.isPending}
            className="h-11 rounded-2xl px-6 font-bold shadow-lg shadow-primary/20"
          >
            Créer
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-muted/35 px-4 py-3 text-sm text-card-foreground/90">
          Remplissez les informations nécessaires, puis attribuez un rôle.
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Rôle</label>
            <select className={selectClass} value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {role === "CLIENT" && (
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Type client</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={typeClient === 0 ? "primary" : "outline"}
                  className="h-11 rounded-2xl"
                  onClick={() => setTypeClient(0)}
                >
                  B2C
                </Button>
                <Button
                  type="button"
                  variant={typeClient === 1 ? "primary" : "outline"}
                  className="h-11 rounded-2xl"
                  onClick={() => setTypeClient(1)}
                >
                  B2B
                </Button>
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.tn"
              className="h-11 rounded-2xl border-border bg-card shadow-sm focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Mot de passe</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-2xl border-border bg-card shadow-sm focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Nom complet</label>
            <Input
              value={nomComplet}
              onChange={(e) => setNomComplet(e.target.value)}
              className="h-11 rounded-2xl border-border bg-card shadow-sm focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Téléphone</label>
            <Input
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="22123456"
              className="h-11 rounded-2xl border-border bg-card shadow-sm focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">CIN</label>
            <Input
              value={cin}
              onChange={(e) => setCin(e.target.value)}
              placeholder="12345678"
              className="h-11 rounded-2xl border-border bg-card shadow-sm focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Date naissance</label>
            <Input
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
              className="h-11 rounded-2xl border-border bg-card shadow-sm focus:ring-4 focus:ring-primary/10"
            />
          </div>

          {role === "CLIENT" && typeClient === 1 && (
            <>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Nom société</label>
                <Input
                  value={nomSociete}
                  onChange={(e) => setNomSociete(e.target.value)}
                  className="h-11 rounded-2xl border-border bg-card shadow-sm focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Matricule fiscal</label>
                <Input
                  value={matriculeFiscal}
                  onChange={(e) => setMatriculeFiscal(e.target.value)}
                  className="h-11 rounded-2xl border-border bg-card shadow-sm focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Gouvernorat</label>
            <select
              className={selectClass}
              value={gouvernorat}
              onChange={(e) => setGouvernorat(Number(e.target.value))}
              disabled={gouvernoratsQuery.isLoading}
            >
              {(gouvernoratsQuery.data ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Délégation</label>
            <select
              className={selectClass}
              value={delegation}
              onChange={(e) => setDelegation(e.target.value)}
              disabled={(delegationsQuery.data?.length ?? 0) === 0}
            >
              {(delegationsQuery.data ?? []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {mut.isError && (
            <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm font-semibold text-rose-700">
              Erreur création utilisateur.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}