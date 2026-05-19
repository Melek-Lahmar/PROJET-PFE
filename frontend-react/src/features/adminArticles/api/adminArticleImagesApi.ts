import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type {
  AdminArticleImage,
  CreateArticleImageRequest,
  UpdateArticleImageRequest,
  UploadArticleImageRequest,
} from "../types/adminArticleImage";

export async function getAdminArticleImages(arRef: string) {
  const { data } = await axiosClient.get<AdminArticleImage[]>(
    endpoints.adminArticleImages(arRef)
  );
  return Array.isArray(data) ? data : [];
}

export async function uploadAdminArticleImage(
  arRef: string,
  payload: UploadArticleImageRequest
) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("isMain", String(payload.isMain));
  formData.append("sortOrder", String(payload.sortOrder));

  const { data } = await axiosClient.post<AdminArticleImage>(
    endpoints.uploadArticleImage(arRef),
    formData
  );

  return data;
}

export async function createAdminArticleImage(
  arRef: string,
  payload: CreateArticleImageRequest
) {
  const { data } = await axiosClient.post<AdminArticleImage>(
    endpoints.createArticleImage(arRef),
    payload
  );
  return data;
}

export async function updateAdminArticleImage(
  id: number,
  payload: UpdateArticleImageRequest
) {
  const { data } = await axiosClient.put<AdminArticleImage>(
    endpoints.updateArticleImage(id),
    payload
  );
  return data;
}

export async function deleteAdminArticleImage(id: number) {
  await axiosClient.delete(endpoints.deleteArticleImage(id));
}