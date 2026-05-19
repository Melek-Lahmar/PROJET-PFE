import { axiosClient } from '../../../core/http/axiosClient';
import { endpoints } from '../../../core/http/endpoints';
import type { HomepageImageAsset } from '../types/homepage';

export async function uploadHomepageImage(payload: { file: File; alt?: string }) {
  const formData = new FormData();
  formData.append('file', payload.file);
  if (payload.alt?.trim()) {
    formData.append('alt', payload.alt.trim());
  }

  const { data } = await axiosClient.post<HomepageImageAsset>(
    endpoints.adminHomepageUploadImage,
    formData,
  );

  return data;
}

export async function deleteHomepageImage(publicId: string) {
  await axiosClient.delete(endpoints.adminHomepageDeleteImage, {
    params: { publicId },
  });
}