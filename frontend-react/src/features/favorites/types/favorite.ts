import type { StockStatus } from "../../catalog/types/article";

export type FavoriteArticleDto = {
  arRef: string;
  designation: string;
  family?: string | null;
  price: number;
  image?: string | null;
  availableStock: number;
  stockStatus: StockStatus;
  isOutOfStock: boolean;
  isLowStock: boolean;
  isInStock: boolean;
  addedAt: string;
};

export type FavoriteCountDto = {
  count: number;
};

export type FavoriteExistsDto = {
  arRef: string;
  isFavorite: boolean;
};

export type FavoriteActionResultDto = {
  arRef: string;
  isFavorite: boolean;
  message: string;
};
