export type PagedResult<T> = {
  total: number;
  skip: number;
  take: number;
  items: T[];
};

export type ListResult<T> = {
  total: number;
  items: T[];
};
