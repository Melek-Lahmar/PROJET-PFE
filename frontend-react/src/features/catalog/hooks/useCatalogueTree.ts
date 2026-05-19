import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCatalogues } from "../api/cataloguesApi";
import type { CatalogueNode } from "../types/catalogue";
import { buildCatalogueTree } from "../utils/buildCatalogueTree";

export function useCatalogueTree() {
  const query = useQuery({
    queryKey: ["catalogues"],
    queryFn: () => getCatalogues({}),
  });

  const roots: CatalogueNode[] = useMemo(() => {
    const items = query.data?.items ?? [];
    return buildCatalogueTree(items);
  }, [query.data]);

  return { ...query, roots };
}
