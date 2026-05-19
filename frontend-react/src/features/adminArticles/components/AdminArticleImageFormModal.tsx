import { useEffect, useState } from "react";
import { Button } from "../../../shared/components/Button";
import type { AdminArticleImage } from "../types/adminArticleImage";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: AdminArticleImage | null;
  onClose: () => void;
  onSubmit: (payload: { url: string; isMain: boolean; sortOrder: number }) => Promise<void> | void;
  loading?: boolean;
};

export function AdminArticleImageFormModal({
  open,
  mode,
  initialValue,
  onClose,
  onSubmit,
  loading = false,
}: Props) {
  const [url, setUrl] = useState("");
  const [isMain, setIsMain] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => {
    if (!open) return;
    setUrl(initialValue?.url ?? "");
    setIsMain(initialValue?.isMain ?? false);
    setSortOrder(initialValue?.sortOrder ?? 0);
  }, [open, initialValue]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await onSubmit({
      url: url.trim(),
      isMain,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-card-foreground">
              {mode === "create" ? "Ajouter une image" : "Modifier l’image"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Gestion par URL uniquement.</p>
          </div>

          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-semibold text-card-foreground/90">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="h-11 w-full rounded-2xl border border-border px-3 text-sm outline-none transition focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-card-foreground/90">
              Ordre d’affichage
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="h-11 w-full rounded-2xl border border-border px-3 text-sm outline-none transition focus:border-primary"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-card-foreground/90">
            <input
              type="checkbox"
              checked={isMain}
              onChange={(e) => setIsMain(e.target.checked)}
            />
            Définir comme image principale
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={loading} disabled={!url.trim()}>
              {mode === "create" ? "Ajouter" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}