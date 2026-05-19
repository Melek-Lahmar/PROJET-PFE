import { Button } from "../../../shared/components/Button";

export type SegmentedTab<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

type Props<T extends string> = {
  tabs: Array<SegmentedTab<T>>;
  value: T;
  onChange: (value: T) => void;
};

export function AdminSegmentedTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Button
            key={tab.key}
            type="button"
            variant={active ? "primary" : "outline"}
            className={`px-4 font-semibold ${active ? "shadow-md" : ""}`}
            onClick={() => onChange(tab.key)}
          >
            <span className="flex items-center gap-2">
              <span>{tab.label}</span>
              {typeof tab.count === "number" ? (
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-white/18 text-white" : "bg-muted/60 text-muted-foreground"}`}>
                  {tab.count}
                </span>
              ) : null}
            </span>
          </Button>
        );
      })}
    </div>
  );
}