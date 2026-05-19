import { getArticles } from "../../catalog/api/articlesApi";

export type GetAdminArticlesParams = {
  take?: number;
  skip?: number;
};

export async function getAdminArticles(params: GetAdminArticlesParams = {}) {
  return getArticles({
    take: params.take ?? 20,
    skip: params.skip ?? 0,
  });
}