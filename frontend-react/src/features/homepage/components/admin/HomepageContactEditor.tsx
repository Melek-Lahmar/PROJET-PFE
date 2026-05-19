import { Input } from "../../../../shared/components/Input";
import type { HomepageContactPayload, HomepageSection } from "../../types/homepage";
import {
  AdminField,
  AdminSectionShell,
  AdminTextarea,
  CtaFieldsEditor,
} from "./HomepageAdminPrimitives";

export function HomepageContactEditor({
  section,
  onChange,
}: {
  section: HomepageSection;
  onChange: (section: HomepageSection) => void;
}) {
  const payload = section.payload as HomepageContactPayload;

  return (
    <div className="space-y-4">
      <AdminSectionShell title="Section Contactez-nous" subtitle="Bloc rassurant et utile, directement éditable par l’admin.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AdminField label="Titre">
            <Input value={payload.title ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, title: e.target.value } })} />
          </AdminField>
          <AdminField label="Sous-titre">
            <Input value={payload.subtitle ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, subtitle: e.target.value } })} />
          </AdminField>
        </div>
        <AdminField label="Description">
          <AdminTextarea value={payload.description ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, description: e.target.value } })} />
        </AdminField>
      </AdminSectionShell>

      <AdminSectionShell title="Coordonnées" subtitle="Réutilise ici les données de contact publiques que tu veux pousser sur la homepage.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminField label="Libellé téléphone">
            <Input value={payload.phoneLabel ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, phoneLabel: e.target.value } })} />
          </AdminField>
          <AdminField label="Téléphone">
            <Input value={payload.phone ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, phone: e.target.value } })} />
          </AdminField>
          <AdminField label="Libellé email">
            <Input value={payload.emailLabel ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, emailLabel: e.target.value } })} />
          </AdminField>
          <AdminField label="Email">
            <Input value={payload.email ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, email: e.target.value } })} />
          </AdminField>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Libellé adresse">
            <Input value={payload.addressLabel ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, addressLabel: e.target.value } })} />
          </AdminField>
          <AdminField label="Adresse">
            <Input value={payload.address ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, address: e.target.value } })} />
          </AdminField>
        </div>
      </AdminSectionShell>

      <AdminSectionShell title="Horaires" subtitle="Une ligne par créneau ou information utile.">
        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <AdminField label="Titre horaires">
            <Input value={payload.hoursTitle ?? ""} onChange={(e) => onChange({ ...section, payload: { ...payload, hoursTitle: e.target.value } })} />
          </AdminField>
          <AdminField label="Liste des horaires" hint="Une ligne = un item">
            <AdminTextarea
              value={(payload.hours ?? []).join("\n")}
              onChange={(e) =>
                onChange({
                  ...section,
                  payload: {
                    ...payload,
                    hours: e.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                  },
                })
              }
            />
          </AdminField>
        </div>
      </AdminSectionShell>

      <div className="grid gap-4 xl:grid-cols-2">
        <CtaFieldsEditor label="CTA principal" value={payload.primaryCta} onChange={(primaryCta) => onChange({ ...section, payload: { ...payload, primaryCta } })} />
        <CtaFieldsEditor label="CTA secondaire" value={payload.secondaryCta} onChange={(secondaryCta) => onChange({ ...section, payload: { ...payload, secondaryCta } })} />
      </div>
    </div>
  );
}