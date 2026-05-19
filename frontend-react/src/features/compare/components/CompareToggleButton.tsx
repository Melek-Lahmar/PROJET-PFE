import type { Article } from "../../catalog/types/article";
import { Button } from "../../../shared/components/Button";
import { useCompareStore } from "../store/compareStore";

type Props = {
  article: Article;
  image?: string | null;
  className?: string;
};

export function CompareToggleButton({ article, image, className = "" }: Props) {
  const items = useCompareStore((s) => s.items);
  const addItem = useCompareStore((s) => s.addItem);
  const removeItem = useCompareStore((s) => s.removeItem);
  const selected = items.some((x) => x.arRef === article.aR_Ref);
  const disabled = !selected && items.length >= 4;

  return (
    <Button
      type="button"
      variant={selected ? "primary" : "outline"}
      disabled={disabled}
      className={className}
      onClick={() => {
        if (selected) {
          removeItem(article.aR_Ref);
          return;
        }

        addItem({
          arRef: article.aR_Ref,
          designation: article.aR_Design,
          price: Number(article.aR_PrixVen ?? 0),
          image,
          stockStatus: article.stockStatus,
          availableStock: Number(article.availableStock ?? 0),
          family: article.fA_CodeFamille,
        });
      }}
    >
      {selected ? "Retirer du comparateur" : disabled ? "Comparateur plein" : "Comparer"}
    </Button>
  );
}
