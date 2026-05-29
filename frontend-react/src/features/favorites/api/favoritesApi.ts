import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";
import type {
  FavoriteActionResultDto,
  FavoriteArticleDto,
  FavoriteCountDto,
  FavoriteExistsDto,
} from "../types/favorite";

export async function getFavorites(): Promise<FavoriteArticleDto[]> {
  const { data } = await axiosClient.get<FavoriteArticleDto[]>(endpoints.favorites);
  return data;
}

export async function getFavoritesCount(): Promise<FavoriteCountDto> {
  const { data } = await axiosClient.get<FavoriteCountDto>(endpoints.favoritesCount);
  return data;
}

export async function isFavorite(arRef: string): Promise<FavoriteExistsDto> {
  const { data } = await axiosClient.get<FavoriteExistsDto>(endpoints.favoriteExists(arRef));
  return data;
}

export async function addFavorite(arRef: string): Promise<FavoriteActionResultDto> {
  const { data } = await axiosClient.post<FavoriteActionResultDto>(endpoints.favoriteByRef(arRef));
  return data;
}

export async function removeFavorite(arRef: string): Promise<FavoriteActionResultDto> {
  const { data } = await axiosClient.delete<FavoriteActionResultDto>(endpoints.favoriteByRef(arRef));
  return data;
}

export async function toggleFavorite(arRef: string): Promise<FavoriteActionResultDto> {
  const { data } = await axiosClient.post<FavoriteActionResultDto>(endpoints.favoriteToggle(arRef));
  return data;
}
