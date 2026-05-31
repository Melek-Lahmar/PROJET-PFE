import { Input } from "../../../../shared/components/Input";
import { Button } from "../../../../shared/components/Button";
import type { HomepageCta, HomepageImage } from "../../types/homepage";

export function AdminTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[110px] w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 py-3 text-sm text-card-foreground shadow-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 ${props.className ?? ""}`}
    />
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="app-kicker">{label}</span>
        {hint ? <span className="text-[11px] font-medium text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export function AdminSectionShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-[28px] border border-border/70 bg-muted/20 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-lg font-black text-card-foreground">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function AdminToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-3 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        checked
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-border/70 bg-card text-muted-foreground hover:border-primary/15 hover:text-card-foreground"
      }`}
    >
      <span
        className={`relative inline-flex h-6 w-11 rounded-full transition ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
      {label}
    </button>
  );
}

export function CtaFieldsEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: HomepageCta | null;
  onChange: (value: HomepageCta) => void;
}) {
  const safeValue = value ?? {};

  return (
    <AdminSectionShell title={label} subtitle="Texte et lien du bouton.">
      <div className="grid gap-4 md:grid-cols-2">
        <AdminField label="Texte du bouton">
          <Input
            value={safeValue.text ?? ""}
            onChange={(e) => onChange({ ...safeValue, text: e.target.value })}
            placeholder="Ex. Découvrir"
          />
        </AdminField>
        <AdminField label="Lien du bouton">
          <Input
            value={safeValue.href ?? ""}
            onChange={(e) => onChange({ ...safeValue, href: e.target.value })}
            placeholder="/articles ou https://..."
          />
        </AdminField>
      </div>
    </AdminSectionShell>
  );
}

export function ImageFieldsEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: HomepageImage | null;
  onChange: (value: HomepageImage) => void;
}) {
  const safeValue: HomepageImage = value ?? {
    sourceType: "url",
    url: "",
    cloudinaryPublicId: "",
    width: null,
    height: null,
    alt: "",
  };

  return (
    <AdminSectionShell title={label} subtitle="Image depuis un lien direct ou la médiathèque.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminField label="Source">
          <select
            className="h-11 w-full rounded-2xl border border-border bg-[hsl(var(--input))] px-4 text-sm text-card-foreground outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
            value={safeValue.sourceType}
            onChange={(e) => onChange({ ...safeValue, sourceType: e.target.value as HomepageImage["sourceType"] })}
          >
            <option value="url">Lien direct</option>
            <option value="cloudinary">Médiathèque</option>
          </select>
        </AdminField>
        <AdminField label="Lien de l’image" hint="Utilisé par défaut">
          <Input
            value={safeValue.url ?? ""}
            onChange={(e) => onChange({ ...safeValue, url: e.target.value })}
            placeholder="https://..."
          />
        </AdminField>
        <AdminField label="Référence média">
          <Input
            value={safeValue.cloudinaryPublicId ?? ""}
            onChange={(e) => onChange({ ...safeValue, cloudinaryPublicId: e.target.value })}
            placeholder="folder/asset"
          />
        </AdminField>
        <AdminField label="Description de l’image">
          <Input
            value={safeValue.alt ?? ""}
            onChange={(e) => onChange({ ...safeValue, alt: e.target.value })}
            placeholder="Description accessible"
          />
        </AdminField>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AdminField label="Largeur optionnelle">
          <Input
            type="number"
            min="0"
            value={safeValue.width ?? ""}
            onChange={(e) =>
              onChange({
                ...safeValue,
                width: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="1920"
          />
        </AdminField>
        <AdminField label="Hauteur optionnelle">
          <Input
            type="number"
            min="0"
            value={safeValue.height ?? ""}
            onChange={(e) =>
              onChange({
                ...safeValue,
                height: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="900"
          />
        </AdminField>
      </div>

      {(safeValue.url || safeValue.cloudinaryPublicId) ? (
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Aperçu visuel</div>
          <div className="overflow-hidden rounded-[22px] border border-border/70 bg-muted/25">
            {safeValue.url ? (
              <img src={safeValue.url} alt={safeValue.alt ?? ""} className="h-48 w-full object-cover" />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Aperçu disponible après résolution de la médiathèque.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </AdminSectionShell>
  );
}

export function ItemToolbar({
  onMoveUp,
  onMoveDown,
  onDelete,
  disableUp,
  disableDown,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  disableUp?: boolean;
  disableDown?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onMoveUp} disabled={disableUp}>
        Monter
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onMoveDown} disabled={disableDown}>
        Descendre
      </Button>
      <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
        Supprimer
      </Button>
    </div>
  );
}
