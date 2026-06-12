import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettingByKey, putSetting } from "../api/settingsApi";
import { useToast } from "../../../shared/components/premium/Toast";

interface DeliveryConfig {
  fraisHome: number;
  timbreFiscal: number;
  delaiJours: number;
}

const DEFAULT_CONFIG: DeliveryConfig = {
  fraisHome: 8,
  timbreFiscal: 1,
  delaiJours: 8,
};

const KEY = "delivery.config";

export function AdminLivraisonSettingsPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data: raw, isPending } = useQuery({
    queryKey: ["admin-setting", KEY],
    queryFn: () => getSettingByKey(KEY),
  });

  const [cfg, setCfg] = useState<DeliveryConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw.valueJson ?? "null");
      if (parsed) setCfg({ ...DEFAULT_CONFIG, ...parsed });
    } catch {}
  }, [raw]);

  const saveMut = useMutation({
    mutationFn: () =>
      putSetting(KEY, JSON.stringify(cfg), false, "Configuration des frais et délais de livraison"),
    onSuccess: () => {
      toast.success("Paramètres de livraison sauvegardés");
      qc.invalidateQueries({ queryKey: ["admin-setting", KEY] });
    },
    onError: (e: any) => toast.error("Erreur", e?.message),
  });

  const field = (
    label: string,
    desc: string,
    key: keyof DeliveryConfig,
    unit: string,
    min: number,
    step = 0.5
  ) => (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div className="flex-1 pr-8">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          step={step}
          value={cfg[key]}
          onChange={(e) =>
            setCfg((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))
          }
          className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-sm text-muted-foreground w-10">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-foreground">Livraison</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Frais appliqués aux commandes et délai d'expédition affiché aux clients.
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Paramètres financiers</h3>
        </div>
        <div className="px-6">
          {isPending ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : (
            <>
              {field(
                "Frais de livraison HOME",
                "Appliqués automatiquement aux commandes en livraison à domicile",
                "fraisHome",
                "TND",
                0,
                0.5
              )}
              {field(
                "Timbre fiscal",
                "Timbre fiscal ajouté à chaque bon de commande",
                "timbreFiscal",
                "TND",
                0,
                0.1
              )}
              {field(
                "Délai de livraison",
                "Délai estimé affiché aux clients lors de la commande (en jours ouvrables)",
                "delaiJours",
                "jours",
                1,
                1
              )}
            </>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
        <span className="font-semibold">Note :</span> Les modifications s'appliquent aux{" "}
        <strong>nouvelles commandes uniquement</strong>. Les commandes existantes conservent leurs
        frais d'origine.
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {saveMut.isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
