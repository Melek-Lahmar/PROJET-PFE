import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCatalogueTree } from "../hooks/useCatalogueTree";
import type { CatalogueNode } from "../types/catalogue";
import { isLeaf } from "../utils/buildCatalogueTree";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function CatalogMegaMenu({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const { roots, isLoading, isError } = useCatalogueTree();

  const [activeRootId, setActiveRootId] = useState<number | null>(null);

  const activeRoot = useMemo(() => {
    if (!activeRootId) return roots[0] ?? null;
    return roots.find((r) => r.cL_No === activeRootId) ?? (roots[0] ?? null);
  }, [roots, activeRootId]);

  const goToLeaf = (node: CatalogueNode) => {
    navigate(`/articles?clNo=${node.cL_No}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <button
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Close menu"
      />

      {/* panel */}
      <div className="absolute left-0 top-0 h-full w-full max-w-6xl bg-card shadow-xl">
        <div className="flex h-full">
          {/* LEFT: parents */}
          <aside className="w-80 border-r bg-card">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="text-sm font-semibold">Product Categories</div>
              <button
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-sm hover:bg-accent/60"
              >
                ✕
              </button>
            </div>

            {isLoading && <div className="px-4 py-3 text-sm text-muted-foreground">Loading...</div>}
            {isError && <div className="px-4 py-3 text-sm text-red-600">Erreur catalogues</div>}

            <ul className="divide-y">
              {roots.map((root) => {
                const active = (activeRoot?.cL_No ?? 0) === root.cL_No;
                return (
                  <li key={root.cL_No}>
                    <button
                      onMouseEnter={() => setActiveRootId(root.cL_No)}
                      onClick={() => setActiveRootId(root.cL_No)}
                      className={[
                        "flex w-full items-center justify-between px-4 py-4 text-left",
                        active ? "bg-accent/50 font-semibold" : "hover:bg-accent/50",
                      ].join(" ")}
                    >
                      <span className="uppercase text-sm">{root.cL_Intitule}</span>
                      <span className="text-muted-foreground/70">›</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* RIGHT: children columns */}
          <section className="flex-1 overflow-auto p-6">
            {!activeRoot ? (
              <div className="text-sm text-muted-foreground">Aucune catégorie</div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold uppercase">
                    {activeRoot.cL_Intitule}
                  </div>

                  {/* option: clic direct si root est leaf */}
                  {isLeaf(activeRoot) && (
                    <button
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-accent/50"
                      onClick={() => goToLeaf(activeRoot)}
                    >
                      Voir les articles
                    </button>
                  )}
                </div>

                <MegaColumns node={activeRoot} onLeafClick={goToLeaf} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MegaColumns({
  node,
  onLeafClick,
}: {
  node: CatalogueNode;
  onLeafClick: (leaf: CatalogueNode) => void;
}) {
  const sections = node.children;

  if (sections.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Aucun sous-catalogue.
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-4">
      {sections.map((section) => (
        <div key={section.cL_No} className="space-y-3">
          <div className="text-sm font-semibold uppercase tracking-wide">
            {section.cL_Intitule}
          </div>

          <ul className="space-y-2">
            {section.children.length === 0 ? (
              <li>
                <button
                  onClick={() => onLeafClick(section)}
                  className="text-sm text-card-foreground/80 hover:underline"
                >
                  Voir les articles
                </button>
              </li>
            ) : (
              section.children.map((child) => (
                <li key={child.cL_No}>
                  {child.children.length === 0 ? (
                    <button
                      onClick={() => onLeafClick(child)}
                      className="text-sm text-card-foreground/80 hover:underline"
                    >
                      {child.cL_Intitule}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => onLeafClick(child)}
                        className="text-sm font-medium text-card-foreground hover:underline"
                        title="Cliquer pour voir les articles de cette catégorie"
                      >
                        {child.cL_Intitule}
                      </button>

                      {/* niveau 3+ */}
                      <ul className="space-y-1 pl-3">
                        {child.children.map((leaf) => (
                          <li key={leaf.cL_No}>
                            <button
                              onClick={() => onLeafClick(leaf)}
                              className="text-sm text-card-foreground/80 hover:underline"
                            >
                              {leaf.cL_Intitule}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
