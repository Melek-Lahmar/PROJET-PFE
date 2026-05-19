import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../shared/components/Button";
import { Modal } from "../../../shared/components/Modal";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { file: File; isMain: boolean; sortOrder: number }) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
};

export function ImageUploadModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  error = null,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isMain, setIsMain] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setIsMain(false);
    setSortOrder(0);
    setLocalError(null);
  }, [open]);

  const helperMessage = useMemo(() => {
    if (!file) return "Formats autorisés : JPG, PNG, WEBP, GIF. Taille max : 10 Mo.";
    return `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} Mo`;
  }, [file]);

  const validateFile = (value: File | null) => {
    if (!value) return "Le fichier image est obligatoire.";

    if (value.type && !ACCEPTED_FILE_TYPES.includes(value.type)) {
      return "Format non autorisé. Utilise JPG, PNG, WEBP ou GIF.";
    }

    if (value.size <= 0) {
      return "Le fichier sélectionné est vide.";
    }

    if (value.size > MAX_FILE_SIZE_BYTES) {
      return "Le fichier dépasse la taille maximale autorisée de 10 Mo.";
    }

    return null;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setLocalError(validateFile(nextFile));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateFile(file);
    setLocalError(validationError);

    if (validationError || !file) return;

    await onSubmit({
      file,
      isMain,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    });
  };

  return (
    <Modal open={open} title="Uploader une image depuis le PC" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-semibold text-card-foreground/90">
            Fichier image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full rounded-2xl border border-border bg-card px-3 py-3 text-sm text-card-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
          />
          <p className="mt-2 text-xs text-muted-foreground">{helperMessage}</p>
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

        {localError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError}
          </div>
        ) : null}

        {!localError && error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Envoyer l’image
          </Button>
        </div>
      </form>
    </Modal>
  );
}