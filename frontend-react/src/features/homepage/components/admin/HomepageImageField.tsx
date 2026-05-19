import { useRef, useState } from 'react';
import { Button } from '../../../../shared/components/Button';
import { Input } from '../../../../shared/components/Input';
import { SmartImage } from '../../../../shared/components/SmartImage';
import { getApiErrorMessage } from '../../../../core/http/getApiErrorMessage';
import { deleteHomepageImage, uploadHomepageImage } from '../../api/homepageAssetsApi';
import type { HomepageImage, HomepageImageSourceType } from '../../types/homepage';

type Props = {
  label: string;
  value?: HomepageImage | null;
  onChange: (next: HomepageImage) => void;
  helperText?: string;
};

export function HomepageImageField({ label, value, onChange, helperText }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const image = value ?? {
    sourceType: 'url' as HomepageImageSourceType,
    url: '',
    cloudinaryPublicId: '',
    alt: '',
    width: null,
    height: null,
  };

  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const previewUrl = image.url?.trim() || undefined;

  const patch = (partial: Partial<HomepageImage>) => {
    onChange({ ...image, ...partial });
  };

  const switchSourceType = (sourceType: HomepageImageSourceType) => {
    setError(null);
    if (sourceType === 'url') {
      onChange({
        sourceType,
        url: image.url ?? '',
        cloudinaryPublicId: '',
        width: null,
        height: null,
        alt: image.alt ?? '',
      });
      return;
    }

    onChange({
      sourceType,
      url: image.url ?? '',
      cloudinaryPublicId: image.cloudinaryPublicId ?? '',
      width: image.width ?? null,
      height: image.height ?? null,
      alt: image.alt ?? '',
    });
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const asset = await uploadHomepageImage({ file, alt: image.alt ?? undefined });
      onChange({
        sourceType: 'cloudinary',
        url: asset.url,
        cloudinaryPublicId: asset.publicId,
        width: asset.width ?? null,
        height: asset.height ?? null,
        alt: asset.alt ?? image.alt ?? '',
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearFromForm = () => {
    setError(null);
    onChange({
      sourceType: image.sourceType,
      url: '',
      cloudinaryPublicId: '',
      width: null,
      height: null,
      alt: image.alt ?? '',
    });
  };

  const removeFromCloudinary = async () => {
    if (!image.cloudinaryPublicId) {
      clearFromForm();
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteHomepageImage(image.cloudinaryPublicId);
      clearFromForm();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="app-kicker">{label}</div>
          {helperText ? <div className="mt-1 text-xs text-muted-foreground">{helperText}</div> : null}
        </div>

        <div className="inline-flex rounded-2xl border border-border bg-card p-1 shadow-sm">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              image.sourceType === 'url'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60'
            }`}
            onClick={() => switchSourceType('url')}
          >
            URL directe
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              image.sourceType === 'cloudinary'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60'
            }`}
            onClick={() => switchSourceType('cloudinary')}
          >
            Cloudinary
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="space-y-3">
          <label className="block space-y-2">
            <span className="app-kicker">Texte alternatif</span>
            <Input value={image.alt ?? ''} onChange={(e) => patch({ alt: e.target.value })} />
          </label>

          {image.sourceType === 'url' ? (
            <label className="block space-y-2">
              <span className="app-kicker">URL de l’image</span>
              <Input
                placeholder="https://..."
                value={image.url ?? ''}
                onChange={(e) => patch({ url: e.target.value, cloudinaryPublicId: '' })}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-dashed border-border px-4 py-4">
                <div className="text-sm text-muted-foreground">
                  Téléverse un fichier image pour cette section homepage.
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    isLoading={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Uploader une image
                  </Button>
                  <Button type="button" variant="outline" onClick={clearFromForm}>
                    Retirer du bloc
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    isLoading={deleting}
                    onClick={removeFromCloudinary}
                  >
                    Supprimer du cloud
                  </Button>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="app-kicker">URL sécurisée retournée</span>
                <Input value={image.url ?? ''} readOnly />
              </label>

              <label className="block space-y-2">
                <span className="app-kicker">Cloudinary publicId</span>
                <Input value={image.cloudinaryPublicId ?? ''} readOnly />
              </label>
            </div>
          )}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/60">
          <div className="flex h-full min-h-[200px] items-center justify-center bg-muted/20">
            <SmartImage
              src={previewUrl}
              alt={image.alt ?? label}
              className="h-full w-full"
              fit="cover"
              placeholderClassName="flex h-full min-h-[200px] w-full items-center justify-center bg-muted/20 text-center text-sm text-muted-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
}