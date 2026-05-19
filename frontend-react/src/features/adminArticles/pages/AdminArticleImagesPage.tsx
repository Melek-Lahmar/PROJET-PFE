import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "../../../shared/components/Button";
import { SmartImage } from "../../../shared/components/SmartImage";
import { env } from "../../../core/config/env";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { resolveImageUrl } from "../../../shared/utils/image";
import { getArticleByRef, getArticles } from "../../catalog/api/articlesApi";
import { AdminArticleImageFormModal } from "../components/AdminArticleImageFormModal";
import { ImageUploadModal } from "../components/ImageUploadModal";
import { PremiumHero } from "../../../shared/components/premium/PremiumHero";
import { PremiumCard } from "../../../shared/components/premium/PremiumCard";
import { EmptyView } from "../../../shared/components/premium/EmptyView";
import { Skeleton } from "../../../shared/components/premium/Skeleton";
import {
  useAdminArticleImages,
  useCreateAdminArticleImage,
  useDeleteAdminArticleImage,
  useUpdateAdminArticleImage,
  useUploadAdminArticleImage,
} from "../hooks/useAdminArticleImages";
import type { AdminArticleImage } from "../types/adminArticleImage";

export function AdminArticleImagesPage() {
  const { arRef = "" } = useParams<{ arRef: string }>();
  const normalizedArRef = useMemo(() => decodeURIComponent(arRef).trim(), [arRef]);

  const [createOpen, setCreateOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<AdminArticleImage | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const deleteBlockedUntilRef = useRef<number>(0);

  const articleQuery = useQuery({
    queryKey: ["admin-article", normalizedArRef],
    queryFn: async () => {
      try {
        return await getArticleByRef(normalizedArRef);
      } catch (error) {
        const fallback = await getArticles({
          search: normalizedArRef,
          take: 100,
          skip: 0,
          publishedOnly: false,
          includeSleeping: true,
        });

        const match = fallback.items.find(
          (item) => item.aR_Ref.trim().toLowerCase() === normalizedArRef.toLowerCase()
        );
        if (match) {
          return match;
        }

        throw error;
      }
    },
    enabled: !!normalizedArRef,
    retry: false,
  });

  const imagesQuery = useAdminArticleImages(normalizedArRef);
  const uploadMutation = useUploadAdminArticleImage(normalizedArRef);
  const createMutation = useCreateAdminArticleImage(normalizedArRef);
  const updateMutation = useUpdateAdminArticleImage(normalizedArRef);
  const deleteMutation = useDeleteAdminArticleImage(normalizedArRef);

  const article = articleQuery.data;

  const images = useMemo(
    () =>
      [...(imagesQuery.data ?? [])].sort((a, b) => {
        if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.id - b.id;
      }),
    [imagesQuery.data]
  );

  useEffect(() => {
    if (!editingImage) return;
    const fresh = images.find((img) => img.id === editingImage.id) ?? null;
    setEditingImage(fresh);
  }, [images, editingImage?.id]);

  useEffect(() => {
    if (!createOpen && !uploadOpen && !editingImage) {
      setActionError(null);
    }
  }, [createOpen, uploadOpen, editingImage]);

  const handleCreate = async (payload: { url: string; isMain: boolean; sortOrder: number }) => {
    try {
      setActionError(null);
      await createMutation.mutateAsync(payload);
      setCreateOpen(false);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const handleUpload = async (payload: { file: File; isMain: boolean; sortOrder: number }) => {
    try {
      setActionError(null);

      deleteBlockedUntilRef.current = Date.now() + 2000;

      await uploadMutation.mutateAsync(payload);
      setUploadOpen(false);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const handleUpdate = async (payload: { url: string; isMain: boolean; sortOrder: number }) => {
    if (!editingImage) return;

    try {
      setActionError(null);
      await updateMutation.mutateAsync({ id: editingImage.id, payload });
      setEditingImage(null);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const handleDelete = async (id: number) => {
    if (Date.now() < deleteBlockedUntilRef.current) {
      return;
    }

    if (!window.confirm("Supprimer cette image ?")) return;

    try {
      setActionError(null);
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const setAsMain = async (image: AdminArticleImage) => {
    try {
      setActionError(null);
      await updateMutation.mutateAsync({
        id: image.id,
        payload: {
          url: image.url,
          isMain: true,
          sortOrder: image.sortOrder,
        },
      });
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  const moveImage = async (image: AdminArticleImage, direction: "up" | "down") => {
    try {
      setActionError(null);
      await updateMutation.mutateAsync({
        id: image.id,
        payload: {
          url: image.url,
          isMain: image.isMain,
          sortOrder: direction === "up" ? Math.max(0, image.sortOrder - 1) : image.sortOrder + 1,
        },
      });
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  if (articleQuery.isPending || imagesQuery.isPending) {
    return (
      <div className="w-full space-y-6 py-6">
        <Skeleton className="h-16 w-1/2" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (articleQuery.isError || !article) {
    return (
      <div className="w-full py-6">
        <EmptyView
          title="Article introuvable"
          description="Impossible de charger les détails de cet article."
          action={
            <Link to="/admin/articles">
              <Button type="button" className="h-11 rounded-2xl px-5">
                ← Retour à la gestion des articles
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-7 pb-10">
      <div>
        <Link
          to="/admin/articles"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Retour à la gestion des articles
        </Link>
      </div>

      <PremiumHero
        kicker="Gestion des images"
        title={article.aR_Design || article.aR_Ref}
        description={
          <span>
            Référence :{" "}
            <span className="font-mono font-bold">{article.aR_Ref}</span>
          </span>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(true)}
              className="h-11 rounded-2xl px-5"
            >
              Ajouter par URL
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setUploadOpen(true)}
              className="h-11 rounded-2xl px-5"
            >
              Uploader depuis le PC
            </Button>
          </>
        }
      />

      {actionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <PremiumCard tone="soft">
          <p className="app-kicker">Référence</p>
          <p className="mt-2 text-lg font-extrabold text-card-foreground">
            {article.aR_Ref}
          </p>
        </PremiumCard>
        <PremiumCard tone="soft">
          <p className="app-kicker">Désignation</p>
          <p className="mt-2 text-lg font-extrabold text-card-foreground">
            {article.aR_Design || "—"}
          </p>
        </PremiumCard>
        <PremiumCard tone="soft">
          <p className="app-kicker">Prix</p>
          <p className="mt-2 text-lg font-extrabold text-primary">
            {typeof article.aR_PrixVen === "number"
              ? `${article.aR_PrixVen.toFixed(3)} TND`
              : "—"}
          </p>
        </PremiumCard>
      </div>

      {images.length === 0 ? (
        <EmptyView
          title="Aucune image"
          description="Aucune image n'a été ajoutée pour cet article."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => (
            <PremiumCard key={image.id} noPadding>
              <div className="aspect-[4/3] bg-muted/30 p-4">
                <SmartImage
                  src={resolveImageUrl(image.url, env.apiBaseUrl)}
                  alt={`${article.aR_Design} ${image.id}`}
                  fit="contain"
                  className="h-full w-full"
                />
              </div>

              <div className="space-y-4 border-t border-border/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {image.isMain ? (
                      <span className="inline-flex rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        Principale
                      </span>
                    ) : null}
                    <span className="inline-flex rounded-xl bg-muted/55 px-2.5 py-1 text-xs font-semibold text-card-foreground/90 ring-1 ring-border">
                      Ordre {image.sortOrder}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground/70">ID #{image.id}</span>
                </div>

                <div>
                  <p className="app-kicker">URL</p>
                  <div className="mt-2 break-all text-sm text-card-foreground/90">
                    {image.url}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setAsMain(image)}>
                    Principale
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingImage(image)}>
                    Modifier
                  </Button>
                  <Button type="button" variant="outline" onClick={() => moveImage(image, "up")}>
                    Monter
                  </Button>
                  <Button type="button" variant="outline" onClick={() => moveImage(image, "down")}>
                    Descendre
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="col-span-2"
                    onClick={() => handleDelete(image.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </PremiumCard>
          ))}
        </div>
      )}

      <ImageUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUpload}
        loading={uploadMutation.isPending}
        error={uploadOpen ? actionError : null}
      />

      <AdminArticleImageFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
      />

      <AdminArticleImageFormModal
        open={!!editingImage}
        mode="edit"
        initialValue={editingImage}
        onClose={() => setEditingImage(null)}
        onSubmit={handleUpdate}
        loading={updateMutation.isPending}
      />
    </div>
  );
}