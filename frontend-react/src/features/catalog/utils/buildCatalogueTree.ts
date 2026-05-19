import type { Catalogue, CatalogueNode } from "../types/catalogue";

export function buildCatalogueTree(items: Catalogue[]): CatalogueNode[] {
  const map = new Map<number, CatalogueNode>();

  for (const c of items) {
    map.set(c.cL_No, { ...c, children: [] });
  }

  const roots: CatalogueNode[] = [];
  for (const node of map.values()) {
    if (!node.cL_NoParent || node.cL_NoParent === 0) {
      roots.push(node);
    } else {
      const parent = map.get(node.cL_NoParent);
      if (parent) parent.children.push(node);
      else roots.push(node); // fallback si parent manquant
    }
  }

  const sortRec = (arr: CatalogueNode[]) => {
    arr.sort((a, b) => a.cL_Intitule.localeCompare(b.cL_Intitule));
    arr.forEach((x) => sortRec(x.children));
  };
  sortRec(roots);

  return roots;
}

export function isLeaf(node: CatalogueNode): boolean {
  return node.children.length === 0;
}
