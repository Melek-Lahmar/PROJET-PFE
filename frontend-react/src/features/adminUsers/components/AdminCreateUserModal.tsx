import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../../shared/components/Modal";
import { Input } from "../../../shared/components/Input";
import { Button } from "../../../shared/components/Button";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { getDepots, type DepotDto } from "../../catalog/api/depotsApi";
import { getDelegations, getGouvernorats } from "../../geo/api/geoApi";
import { adminCreateUser } from "../api/adminUsersApi";
import type { AdminRole, CreateUserRequestDto, UserCreationKind } from "../types/adminUsers";

type Props = {
  open: boolean;
  onClose: () => void;
};

type KindOption = {
  kind: UserCreationKind;
  label: string;
  description: string;
};

const KIND_OPTIONS: KindOption[] = [
  { kind: "CLIENT_B2C", label: "Client B2C", description: "Client particulier avec livraison domicile ou retrait." },
  { kind: "CLIENT_B2B", label: "Client B2B", description: "Compte professionnel avec société et matricule fiscal." },
  { kind: "VENDEUR", label: "Vendeur", description: "Employé commerce rattachable à un dépôt." },
  { kind: "CONFIRMATEUR", label: "Confirmateur", description: "Employé du service commandes." },
  { kind: "LIVREUR", label: "Livreur", description: "Livreur classique de zone." },
  { kind: "LIVREUR_TRANSIT", label: "Livreur de transit", description: "Livreur inter-dépôts, rôle LIVREUR + IsTransit." },
  { kind: "SUPERVISEUR", label: "Superviseur", description: "Responsable logistique." },
  { kind: "ADMIN", label: "Administrateur", description: "Compte administrateur complet." },
];

function roleForKind(kind: UserCreationKind): AdminRole {
  if (kind === "CLIENT_B2C" || kind === "CLIENT_B2B") return "CLIENT";
  if (kind === "LIVREUR_TRANSIT") return "LIVREUR";
  return kind;
}

function typeClientForKind(kind: UserCreationKind) {
  if (kind === "CLIENT_B2C") return 0;
  if (kind === "CLIENT_B2B") return 1;
  return null;
}

function defaultsForKind(kind: UserCreationKind) {
  switch (kind) {
    case "VENDEUR":
      return { poste: "Vendeur", departement: "Commerce", zoneLivraison: "" };
    case "CONFIRMATEUR":
      return { poste: "Confirmateur", departement: "Service commandes", zoneLivraison: "" };
    case "LIVREUR":
      return { poste: "Livreur", departement: "Logistique", zoneLivraison: "ZONE" };
    case "LIVREUR_TRANSIT":
      return { poste: "Livreur Transit", departement: "Logistique", zoneLivraison: "TRANSIT" };
    case "SUPERVISEUR":
      return { poste: "Superviseur", departement: "Logistique", zoneLivraison: "" };
    case "ADMIN":
      return { poste: "Administrateur", departement: "Administration", zoneLivraison: "" };
    default:
      return { poste: "", departement: "", zoneLivraison: "" };
  }
}

function sanitize(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function AdminCreateUserModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<UserCreationKind>("CLIENT_B2C");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("12345678");
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [cin, setCin] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [gouvernorat, setGouvernorat] = useState<number>(22);
  const [delegation, setDelegation] = useState("");
  const [adresse, setAdresse] = useState("");
  const [adresseComplementaire, setAdresseComplementaire] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [pays, setPays] = useState("Tunisie");
  const [nomSociete, setNomSociete] = useState("");
  const [matriculeFiscal, setMatriculeFiscal] = useState("");
  const [registreCommerce, setRegistreCommerce] = useState("");
  const [numeroTVA, setNumeroTVA] = useState("");
  const [codeEmploye, setCodeEmploye] = useState("");
  const [depotRattacheNo, setDepotRattacheNo] = useState<number>(0);
  const [showErrors, setShowErrors] = useState(false);

  const needsDepot = kind === "LIVREUR_TRANSIT" || kind === "VENDEUR";
  const isClientB2B = kind === "CLIENT_B2B";
  const isClient = kind === "CLIENT_B2C" || kind === "CLIENT_B2B";
  const defaults = defaultsForKind(kind);

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

  const depotsQuery = useQuery<DepotDto[]>({
    queryKey: ["depots", "admin-create-user", kind],
    queryFn: () => getDepots(false),
    enabled: open && needsDepot,
  });

  useEffect(() => {
    if (!open) return;
    const list = delegationsQuery.data ?? [];
    if (!delegation && list.length > 0) queueMicrotask(() => setDelegation(list[0]));
    if (list.length === 0) queueMicrotask(() => setDelegation(""));
  }, [open, delegationsQuery.data, delegation]);

  useEffect(() => {
    if (!needsDepot) {
      queueMicrotask(() => setDepotRattacheNo(0));
      return;
    }

    const depots = depotsQuery.data ?? [];
    if (depotRattacheNo <= 0 && depots.length > 0) {
      queueMicrotask(() => setDepotRattacheNo(depots[0].dE_No));
    }
  }, [needsDepot, depotsQuery.data, depotRattacheNo]);

  const fieldErrors = useMemo(() => {
    const errors: Record<string, string | undefined> = {
      email: !email.trim() ? "Email requis" : undefined,
      password: !password.trim() ? "Mot de passe requis" : undefined,
      nomComplet: !nomComplet.trim() ? "Nom complet requis" : undefined,
      telephone: !telephone.trim() ? "Téléphone requis" : undefined,
      delegation: !delegation.trim() ? "Délégation requise" : undefined,
      adresse: !adresse.trim() ? "Adresse requise" : undefined,
      codePostal: !codePostal.trim() ? "Code postal requis" : undefined,
      pays: !pays.trim() ? "Pays requis" : undefined,
    };

    if (isClientB2B) {
      errors.nomSociete = !nomSociete.trim() ? "Nom société requis" : undefined;
      errors.matriculeFiscal = !matriculeFiscal.trim() ? "Matricule fiscal requis" : undefined;
    }

    if (kind === "LIVREUR_TRANSIT") {
      errors.depotRattacheNo = depotRattacheNo <= 0 ? "Dépôt obligatoire" : undefined;
    }

    return errors;
  }, [email, password, nomComplet, telephone, delegation, adresse, codePostal, pays, isClientB2B, nomSociete, matriculeFiscal, kind, depotRattacheNo]);

  const canSubmit = !Object.values(fieldErrors).some(Boolean);

  const mut = useMutation({
    mutationFn: async () => {
      const role = roleForKind(kind);
      const typeClient = typeClientForKind(kind);
      const dto: CreateUserRequestDto = {
        email: email.trim(),
        password,
        role,
        typeProfil: role === "CLIENT" ? 0 : 1,
        typeClient,
        nomComplet: sanitize(nomComplet),
        telephone: sanitize(telephone),
        cin: sanitize(cin),
        dateNaissance: dateNaissance || null,
        gouvernorat,
        delegation,
        adresse: sanitize(adresse),
        adresseComplementaire: sanitize(adresseComplementaire),
        codePostal: sanitize(codePostal),
        pays: sanitize(pays) ?? "Tunisie",
        nomSociete: isClientB2B ? sanitize(nomSociete) : null,
        matriculeFiscal: isClientB2B ? sanitize(matriculeFiscal) : null,
        registreCommerce: isClientB2B ? sanitize(registreCommerce) : null,
        numeroTVA: isClientB2B ? sanitize(numeroTVA) : null,
        poste: role === "CLIENT" ? null : defaults.poste,
        departement: role === "CLIENT" ? null : defaults.departement,
        codeEmploye: role === "CLIENT" ? null : sanitize(codeEmploye),
        zoneLivraison: role === "LIVREUR" ? defaults.zoneLivraison : null,
        isTransit: kind === "LIVREUR_TRANSIT",
        depotRattacheNo: needsDepot && depotRattacheNo > 0 ? depotRattacheNo : null,
        codeDepot: needsDepot && depotRattacheNo > 0 ? String(depotRattacheNo) : null,
      };
      return adminCreateUser(dto);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      resetForm();
      onClose();
    },
  });

  const selectClass =
    "h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-card-foreground shadow-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

  function resetForm() {
    setKind("CLIENT_B2C");
    setEmail("");
    setPassword("12345678");
    setNomComplet("");
    setTelephone("");
    setCin("");
    setDateNaissance("");
    setGouvernorat(22);
    setDelegation("");
    setAdresse("");
    setAdresseComplementaire("");
    setCodePostal("");
    setPays("Tunisie");
    setNomSociete("");
    setMatriculeFiscal("");
    setRegistreCommerce("");
    setNumeroTVA("");
    setCodeEmploye("");
    setDepotRattacheNo(0);
    setShowErrors(false);
  }

  function renderError(key: string) {
    const message = fieldErrors[key];
    if (!showErrors || !message) return null;
    return <p className="mt-1 text-xs font-medium text-danger">{message}</p>;
  }

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
            onClick={() => {
              setShowErrors(true);
              if (canSubmit) mut.mutate();
            }}
            isLoading={mut.isPending}
            disabled={mut.isPending}
            className="h-11 rounded-2xl px-6 font-bold shadow-lg shadow-primary/20"
          >
            Créer
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-muted/35 px-4 py-3 text-sm text-card-foreground/90">
          Sélectionnez un type métier. Le backend reconstruit ensuite la cohérence rôle, profil, type client et transit.
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="admin-create-kind" className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Type utilisateur</label>
            <select id="admin-create-kind" className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as UserCreationKind)}>
              {KIND_OPTIONS.map((option) => (
                <option key={option.kind} value={option.kind}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {KIND_OPTIONS.find((option) => option.kind === kind)?.description}
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.tn" />
            {renderError("email")}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Mot de passe</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {renderError("password")}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Nom complet</label>
            <Input value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} placeholder="Nom et prénom" />
            {renderError("nomComplet")}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Téléphone</label>
            <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="22123456" />
            {renderError("telephone")}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">CIN</label>
            <Input value={cin} onChange={(e) => setCin(e.target.value)} placeholder="Optionnel" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Date naissance</label>
            <Input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
          </div>

          {isClientB2B ? (
            <>
              <div>
                <label htmlFor="admin-create-company" className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Nom société</label>
                <Input id="admin-create-company" value={nomSociete} onChange={(e) => setNomSociete(e.target.value)} />
                {renderError("nomSociete")}
              </div>
              <div>
                <label htmlFor="admin-create-tax-id" className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Matricule fiscal</label>
                <Input id="admin-create-tax-id" value={matriculeFiscal} onChange={(e) => setMatriculeFiscal(e.target.value)} />
                {renderError("matriculeFiscal")}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Registre commerce</label>
                <Input value={registreCommerce} onChange={(e) => setRegistreCommerce(e.target.value)} placeholder="Optionnel" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Numéro TVA</label>
                <Input value={numeroTVA} onChange={(e) => setNumeroTVA(e.target.value)} placeholder="Optionnel" />
              </div>
            </>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Gouvernorat</label>
            <select className={selectClass} value={gouvernorat} onChange={(e) => setGouvernorat(Number(e.target.value))} disabled={gouvernoratsQuery.isLoading}>
              {(gouvernoratsQuery.data ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Délégation</label>
            <select className={selectClass} value={delegation} onChange={(e) => setDelegation(e.target.value)} disabled={(delegationsQuery.data?.length ?? 0) === 0}>
              {(delegationsQuery.data ?? []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {renderError("delegation")}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Adresse</label>
            <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Rue, bâtiment, zone..." />
            {renderError("adresse")}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Code postal</label>
            <Input value={codePostal} onChange={(e) => setCodePostal(e.target.value)} placeholder="3000" />
            {renderError("codePostal")}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Pays</label>
            <Input value={pays} onChange={(e) => setPays(e.target.value)} placeholder="Tunisie" />
            {renderError("pays")}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Complément adresse</label>
            <Input value={adresseComplementaire} onChange={(e) => setAdresseComplementaire(e.target.value)} placeholder="Optionnel" />
          </div>

          {!isClient ? (
            <>
              <div className="rounded-2xl border border-border bg-muted/35 px-4 py-3 text-sm">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Poste</div>
                <div className="mt-1 font-bold text-card-foreground">{defaults.poste}</div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/35 px-4 py-3 text-sm">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Département</div>
                <div className="mt-1 font-bold text-card-foreground">{defaults.departement}</div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Code employé</label>
                <Input value={codeEmploye} onChange={(e) => setCodeEmploye(e.target.value)} placeholder="Optionnel" />
              </div>

              {kind === "LIVREUR" ? (
                <div className="rounded-2xl border border-border bg-muted/35 px-4 py-3 text-sm">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Zone livraison</div>
                  <div className="mt-1 font-bold text-card-foreground">ZONE</div>
                </div>
              ) : null}

              {needsDepot ? (
                <div className="md:col-span-2">
                  <label htmlFor="admin-create-depot" className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Dépôt {kind === "LIVREUR_TRANSIT" ? "obligatoire" : "rattaché"}
                  </label>
                  <select
                    id="admin-create-depot"
                    className={selectClass}
                    value={depotRattacheNo}
                    onChange={(e) => setDepotRattacheNo(Number(e.target.value))}
                    disabled={depotsQuery.isLoading || (depotsQuery.data?.length ?? 0) === 0}
                  >
                    <option value={0}>Sélectionner un dépôt</option>
                    {(depotsQuery.data ?? []).map((d) => (
                      <option key={d.dE_No} value={d.dE_No}>
                        {d.dE_Intitule || d.dE_Code} ({d.dE_Code})
                      </option>
                    ))}
                  </select>
                  {renderError("depotRattacheNo")}
                </div>
              ) : null}
            </>
          ) : null}

          {mut.isError ? (
            <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm font-semibold text-rose-700">
              {getApiErrorMessage(mut.error)}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
