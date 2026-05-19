import { useQuery } from "@tanstack/react-query";
import { getAdminArticles } from "../api/adminArticlesApi";

export function useAdminArticles(skip = 0, take = 20) {
  return useQuery({
    queryKey: ["admin-articles", skip, take],
    queryFn: () => getAdminArticles({ skip, take }),
  });
}