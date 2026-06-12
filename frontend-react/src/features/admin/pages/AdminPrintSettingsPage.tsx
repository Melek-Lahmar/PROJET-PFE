import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPrintSettings,
  savePrintSettings,
  uploadLogo,
  previewBLPdf,
  defaultFieldsConfig,
  type PrintSettings,
  type PrintFieldsConfig,
} from "../api/printSettingsApi";
import { openPdfBlob } from "../../vendeur/api/manifesteApi";

const SETTINGS_TABS = [
  { href: "/admin/settings", label: "Paramètres généraux", exact: true },
  { href: "/admin/settings/sage-x3", label: "Connexion Sage X3", exact: false },
  { href: "/admin/settings/print", label: "Impression", exact: false },
];

function SettingsTabBar() {
  const { pathname } = useLocation();
  return (
    <div className="flex gap-1 rounded-2xl border border-border bg-muted/30 p-1">
      {SETTINGS_TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link key={t.href} to={t.href}
            className={`flex-1 rounded-xl px-4 py-2 text-center text-sm font-semibold transition ${active ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-sm font-semibold text-card-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          value ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-card-foreground outline-none ring-0 transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

export function AdminPrintSettingsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["print-settings"],
    queryFn: getPrintSettings,
  });

  const [form, setForm] = useState<Omit<PrintSettings, "id" | "updatedAt">>({
    companyName: "",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    matriculeFiscal: "",
    registreCommerce: "",
    logoUrl: "",
    footerText: "",
    fieldsConfig: defaultFieldsConfig,
  });

  // Sync form when data arrives from server
  useEffect(() => {
    if (data) {
      setForm({
        companyName: data.companyName ?? "",
        companyAddress: data.companyAddress ?? "",
        companyPhone: data.companyPhone ?? "",
        companyEmail: data.companyEmail ?? "",
        matriculeFiscal: data.matriculeFiscal ?? "",
        registreCommerce: data.registreCommerce ?? "",
        logoUrl: data.logoUrl ?? "",
        footerText: data.footerText ?? "",
        fieldsConfig: data.fieldsConfig ?? defaultFieldsConfig,
      });
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: savePrintSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["print-settings"] }),
  });

  const previewMut = useMutation({
    mutationFn: previewBLPdf,
    onSuccess: (blob) => openPdfBlob(blob, "preview-bl.pdf"),
  });

  const logoMut = useMutation({
    mutationFn: uploadLogo,
    onSuccess: (url) => {
      setForm((f) => ({ ...f, logoUrl: url }));
      qc.invalidateQueries({ queryKey: ["print-settings"] });
    },
  });

  const setField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setFieldConfig = (key: keyof PrintFieldsConfig, val: boolean) =>
    setForm((f) => ({ ...f, fieldsConfig: { ...f.fieldsConfig, [key]: val } }));

  if (isLoading)
    return <div className="py-16 text-center text-muted-foreground">Chargement...</div>;

  const cfg = form.fieldsConfig;

  return (
    <div className="w-full max-w-4xl space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Paramètres d'impression</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Logo, informations société et champs affichés sur les bons de livraison et factures.
        </p>
      </div>
      <SettingsTabBar />

      {/* Logo */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-bold">Logo de la société</h2>
        <div className="flex items-center gap-5">
          {form.logoUrl ? (
            <img
              src={form.logoUrl}
              alt="Logo"
              className="h-16 w-auto rounded-xl border border-border object-contain p-1"
            />
          ) : (
            <div className="flex h-16 w-24 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              Aucun logo
            </div>
          )}
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) logoMut.mutate(f);
            }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={logoMut.isPending}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
            >
              {logoMut.isPending ? "Upload..." : "Changer le logo"}
            </button>
            <p className="text-xs text-muted-foreground">PNG, JPG ou SVG recommandé</p>
          </div>
        </div>
      </section>

      {/* Infos société */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-bold">Informations société</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Nom société" value={form.companyName ?? ""} onChange={(v) => setField("companyName", v)} placeholder="Mon Entreprise" />
          <InputField label="Téléphone" value={form.companyPhone ?? ""} onChange={(v) => setField("companyPhone", v)} placeholder="+216 XX XXX XXX" />
          <div className="sm:col-span-2">
            <InputField label="Adresse" value={form.companyAddress ?? ""} onChange={(v) => setField("companyAddress", v)} placeholder="Rue, Ville, Code Postal" />
          </div>
          <InputField label="Email" value={form.companyEmail ?? ""} onChange={(v) => setField("companyEmail", v)} placeholder="contact@societe.tn" />
          <InputField label="Matricule fiscal" value={form.matriculeFiscal ?? ""} onChange={(v) => setField("matriculeFiscal", v)} placeholder="MF12345" />
          <InputField label="Registre Commerce" value={form.registreCommerce ?? ""} onChange={(v) => setField("registreCommerce", v)} placeholder="RC67890" />
          <div className="sm:col-span-2">
            <InputField label="Texte pied de page" value={form.footerText ?? ""} onChange={(v) => setField("footerText", v)} placeholder="Merci de votre confiance." />
          </div>
        </div>
      </section>

      {/* Champs à afficher */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-bold">Champs à afficher sur le BL</h2>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">En-tête</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleField label="N° BL" value={cfg.showBlNumber} onChange={(v) => setFieldConfig("showBlNumber", v)} />
            <ToggleField label="Date" value={cfg.showDate} onChange={(v) => setFieldConfig("showDate", v)} />
            <ToggleField label="Source BC" value={cfg.showSourceBc} onChange={(v) => setFieldConfig("showSourceBc", v)} />
            <ToggleField label="Dépôt" value={cfg.showDepot} onChange={(v) => setFieldConfig("showDepot", v)} />
            <ToggleField label="Code client" value={cfg.showClientCode} onChange={(v) => setFieldConfig("showClientCode", v)} />
            <ToggleField label="Téléphone client" value={cfg.showClientPhone} onChange={(v) => setFieldConfig("showClientPhone", v)} />
            <ToggleField label="Livreur" value={cfg.showLivreur} onChange={(v) => setFieldConfig("showLivreur", v)} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Lignes articles</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleField label="Prix unitaire HT" value={cfg.showUnitPriceHT} onChange={(v) => setFieldConfig("showUnitPriceHT", v)} />
            <ToggleField label="Montant HT" value={cfg.showAmountHT} onChange={(v) => setFieldConfig("showAmountHT", v)} />
            <ToggleField label="Montant TTC" value={cfg.showAmountTTC} onChange={(v) => setFieldConfig("showAmountTTC", v)} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Totaux</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleField label="Total HT" value={cfg.showTotalHT} onChange={(v) => setFieldConfig("showTotalHT", v)} />
            <ToggleField label="TVA" value={cfg.showTVA} onChange={(v) => setFieldConfig("showTVA", v)} />
            <ToggleField label="Frais livraison" value={cfg.showFraisLivraison} onChange={(v) => setFieldConfig("showFraisLivraison", v)} />
            <ToggleField label="Timbre fiscal" value={cfg.showTimbreFiscal} onChange={(v) => setFieldConfig("showTimbreFiscal", v)} />
            <ToggleField label="Net à payer" value={cfg.showNetAPayer} onChange={(v) => setFieldConfig("showNetAPayer", v)} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Signatures</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleField label="Signature livreur" value={cfg.showSignatureLivreur} onChange={(v) => setFieldConfig("showSignatureLivreur", v)} />
            <ToggleField label="Signature client" value={cfg.showSignatureClient} onChange={(v) => setFieldConfig("showSignatureClient", v)} />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => saveMut.mutate(form)}
          disabled={saveMut.isPending}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
        >
          {saveMut.isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          onClick={() => previewMut.mutate()}
          disabled={previewMut.isPending}
          className="rounded-xl border border-border px-6 py-2.5 text-sm font-bold transition hover:bg-muted disabled:opacity-50"
        >
          {previewMut.isPending ? "Génération..." : "Prévisualiser PDF"}
        </button>
        {saveMut.isSuccess && (
          <span className="flex items-center text-sm font-semibold text-green-600">
            Paramètres sauvegardés.
          </span>
        )}
        {saveMut.isError && (
          <span className="flex items-center text-sm font-semibold text-destructive">
            Erreur lors de la sauvegarde. Veuillez réessayer.
          </span>
        )}
        {previewMut.isError && (
          <span className="flex items-center text-sm font-semibold text-destructive">
            Erreur lors de la génération du PDF.
          </span>
        )}
      </div>
    </div>
  );
}
