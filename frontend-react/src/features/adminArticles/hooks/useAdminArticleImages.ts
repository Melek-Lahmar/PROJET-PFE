import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminArticleImage,
  deleteAdminArticleImage,
  getAdminArticleImages,
  updateAdminArticleImage,
  uploadAdminArticleImage,
} from "../api/adminArticleImagesApi";
import type {
  CreateArticleImageRequest,
  UpdateArticleImageRequest,
  UploadArticleImageRequest,
} from "../types/adminArticleImage";

function invalidateArticleImageQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  arRef: string
) {
  queryClient.invalidateQueries({ queryKey: ["admin-article-images", arRef] });
  queryClient.invalidateQueries({ queryKey: ["article-images", arRef] });
  queryClient.invalidateQueries({ queryKey: ["articles-main-images"] });
}

export function useAdminArticleImages(arRef: string) {
  return useQuery({
    queryKey: ["admin-article-images", arRef],
    queryFn: () => getAdminArticleImages(arRef),
    enabled: !!arRef,
  });
}

export function useUploadAdminArticleImage(arRef: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UploadArticleImageRequest) =>
      uploadAdminArticleImage(arRef, payload),
    onSuccess: () => invalidateArticleImageQueries(queryClient, arRef),
  });
}

export function useCreateAdminArticleImage(arRef: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateArticleImageRequest) =>
      createAdminArticleImage(arRef, payload),
    onSuccess: () => invalidateArticleImageQueries(queryClient, arRef),
  });
}

export function useUpdateAdminArticleImage(arRef: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateArticleImageRequest }) =>
      updateAdminArticleImage(id, payload),
    onSuccess: () => invalidateArticleImageQueries(queryClient, arRef),
  });
}

export function useDeleteAdminArticleImage(arRef: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteAdminArticleImage(id),
    onSuccess: () => invalidateArticleImageQueries(queryClient, arRef),
  });
}