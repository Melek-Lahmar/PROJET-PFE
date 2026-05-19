export type AdminArticleImage = {
  id: number;
  url: string;
  isMain: boolean;
  sortOrder: number;
  createdAt?: string | null;
};

export type CreateArticleImageRequest = {
  url: string;
  isMain: boolean;
  sortOrder: number;
};

export type UpdateArticleImageRequest = {
  url: string;
  isMain: boolean;
  sortOrder: number;
};