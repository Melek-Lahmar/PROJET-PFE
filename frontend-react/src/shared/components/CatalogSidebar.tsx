import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCatalogues } from "../../features/catalog/api/cataloguesApi";
import type { Catalogue } from "../../features/catalog/types/catalogue";
import { CatalogueIcon } from "../../features/catalog/utils/catalogueIcons";
import { Button } from "./Button";

type Props = {
  open: boolean;
  onClose: () => void;
};

type CatalogueNode = Catalogue & { children: CatalogueNode[] };

function buildTree(items: Catalogue[]): CatalogueNode[] {
  const map = new Map<number, CatalogueNode>();
  items.forEach((c) => map.set(c.cL_No, { ...c, children: [] }));

  const roots: CatalogueNode[] = [];

  for (const node of map.values()) {
    const parentId = node.cL_NoParent;
    if (!parentId || parentId === 0) {
      roots.push(node);
    } else {
      const parent = map.get(parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }

  const sortRec = (arr: CatalogueNode[]) => {
    arr.sort((a, b) => (a.cL_Intitule ?? "").localeCompare(b.cL_Intitule ?? ""));
    arr.forEach((x) => sortRec(x.children));
  };

  sortRec(roots);
  return roots;
}

function flattenLeafCount(node: CatalogueNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((total, child) => total + flattenLeafCount(child), 0);
}

export function CatalogSidebar({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalogues"],
    queryFn: () => getCatalogues({}),
  });

  const roots = useMemo(() => {
    const items = data?.items ?? [];
    return buildTree(items);
  }, [data]);

  const [activeRoot, setActiveRoot] = useState<number | null>(null);

  const currentRoot = useMemo(() => {
    if (!roots.length) return null;
    const id = activeRoot ?? roots[0].cL_No;
    return roots.find((r) => r.cL_No === id) ?? roots[0];
  }, [roots, activeRoot]);

  const goLeaf = (leaf: CatalogueNode) => {
    navigate(`/articles?clNo=${leaf.cL_No}`);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/55 backdrop-blur-md"
        onClick={onClose}
        aria-label="Fermer le catalogue"
      />

      <div className="relative z-10 m-0 flex h-full w-full max-w-[1180px] overflow-hidden border border-shell-border/70 bg-shell text-shell-foreground shadow-[0_45px_120px_-60px_rgba(2,6,23,0.95)] sm:m-4 sm:h-[calc(100%-2rem)] sm:w-[94vw] sm:rounded-[34px]">
        <aside className="flex w-full flex-col border-r border-border/70 bg-card text-card-foreground sm:w-80">
          <div className="flex items-center justify-between border-b border-border/70 bg-card px-5 py-5">
            <div>
              <div className="app-kicker text-muted-foreground">Catalogue</div>
              <h2 className="mt-1 text-xl font-black tracking-tight text-card-foreground">Départements</h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition hover:border-primary/25 hover:text-primary"
              aria-label="Fermer"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            {isLoading ? <div className="px-3 py-4 text-sm text-muted-foreground">Chargement des départements...</div> : null}
            {isError ? <div className="px-3 py-4 text-sm text-danger">Erreur de chargement du catalogue.</div> : null}

            <nav className="space-y-2">
              {roots.map((root) => {
                const isActive = currentRoot?.cL_No === root.cL_No;
                return (
                  <button
                    key={root.cL_No}
                    type="button"
                    onMouseEnter={() => setActiveRoot(root.cL_No)}
                    onClick={() => setActiveRoot(root.cL_No)}
                    className={`w-full rounded-2xl border px-4 py-3.5 text-left shadow-sm transition ${
                      isActive
                        ? "border-primary/35 bg-primary/[0.07] text-card-foreground shadow-md"
                        : "border-border/70 bg-card text-card-foreground hover:border-primary/25 hover:bg-accent/45"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                            isActive
                              ? "border-primary/25 bg-card text-primary"
                              : "border-border/70 bg-accent/45 text-primary/80"
                          }`}
                        >
                          <CatalogueIcon name={root.cL_Intitule} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{root.cL_Intitule}</div>
                          <div className="mt-1 text-xs font-medium text-muted-foreground">
                            {flattenLeafCount(root)} sous-catégories
                          </div>
                        </div>
                      </div>
                      <span className={`text-lg ${isActive ? "text-primary" : "text-muted-foreground"}`}>›</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="min-h-0 flex-1 overflow-y-auto bg-card text-card-foreground">
          <div className="flex items-center justify-between border-b border-border/70 px-6 py-5 md:px-8">
            <div>
              <div className="app-kicker">Navigation catalogue</div>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-card-foreground">
                {currentRoot?.cL_Intitule ?? "Catalogue"}
              </h3>
            </div>

            <Button type="button" variant="outline" onClick={onClose} className="rounded-2xl px-5">
              Fermer
            </Button>
          </div>

          <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
            {!currentRoot && !isLoading ? (
              <div className="app-surface-soft p-8 text-center">
                <div className="text-base font-bold text-card-foreground">Sélectionnez un département</div>
                <div className="mt-2 text-sm text-muted-foreground">Choisissez une rubrique à gauche pour afficher les catégories disponibles.</div>
              </div>
            ) : null}

            {currentRoot ? (
              currentRoot.children.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {currentRoot.children.map((section) => {
                    const children = section.children ?? [];
                    const visibleChildren = children.slice(0, 8);

                    return (
                      <div key={section.cL_No} className="app-surface-soft flex h-full flex-col p-5">
                        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-accent/60 text-primary">
                              <CatalogueIcon name={section.cL_Intitule} className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-card-foreground">{section.cL_Intitule}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {children.length > 0 ? `${children.length} éléments` : "Catégorie finale"}
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant={children.length > 0 ? "outline" : "primary"}
                            size="sm"
                            onClick={() => goLeaf(section)}
                            className="rounded-xl px-3"
                          >
                            {children.length > 0 ? "Voir tout" : "Ouvrir"}
                          </Button>
                        </div>

                        {children.length > 0 ? (
                          <div className="mt-4 flex-1 space-y-2">
                            {visibleChildren.map((child) => (
                              <button
                                key={child.cL_No}
                                type="button"
                                onClick={() => goLeaf(child)}
                                className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-card/70 px-3 py-3 text-left text-sm font-medium text-card-foreground transition hover:border-primary/25 hover:bg-accent/55"
                                title={child.cL_Intitule}
                              >
                                <span className="truncate">{child.cL_Intitule}</span>
                                <span className="text-muted-foreground">→</span>
                              </button>
                            ))}

                            {children.length > visibleChildren.length ? (
                              <div className="pt-2 text-xs font-medium text-muted-foreground">
                                + {children.length - visibleChildren.length} autres catégories
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/35 px-4 py-5 text-sm text-muted-foreground">
                            Cette rubrique ne contient pas de sous-catégories. Vous pouvez l’ouvrir directement.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="app-surface-soft p-8 md:p-10">
                  <div className="max-w-2xl space-y-4">
                    <div>
                      <div className="app-kicker">Rubrique finale</div>
                      <h4 className="mt-1 text-2xl font-black text-card-foreground">{currentRoot.cL_Intitule}</h4>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Cette rubrique ne contient pas de niveau enfant. Ouvrez-la directement pour afficher les articles correspondants.
                      </p>
                    </div>

                    <Button type="button" variant="primary" className="rounded-2xl px-5" onClick={() => goLeaf(currentRoot)}>
                      Voir les articles
                    </Button>
                  </div>
                </div>
              )
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
