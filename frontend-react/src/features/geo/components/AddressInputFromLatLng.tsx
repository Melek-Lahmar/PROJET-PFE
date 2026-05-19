import { useEffect, useMemo, useRef, useState } from "react";
import * as olc from "open-location-code";
import { useReverseGeocode } from "../hooks/useReverseGeocode";
import { formatShortAddress } from "../utils/addressFormat";
import { Button } from "../../../shared/components/Button";

type Props = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  value: string;
  onChange: (next: string) => void;
  codePostalValue?: string;
  onCodePostalChange?: (next: string) => void;

  autoFillIfEmpty?: boolean;
  autoFillCodePostalIfEmpty?: boolean;

  label?: string;
  placeholder?: string;
  className?: string;
};

function buildAddressValue(plusCode: string, shortAddress: string) {
  const pc = (plusCode || "").trim();
  const addr = (shortAddress || "").trim();

  if (pc && addr) return `${pc}, ${addr}`;
  if (pc) return pc;
  if (addr) return addr;
  return "";
}

export function AddressInputFromLatLng({
  latitude,
  longitude,
  value,
  onChange,

  codePostalValue,
  onCodePostalChange,

  autoFillIfEmpty = true,
  autoFillCodePostalIfEmpty = true,

  label = "Adresse (obligatoire)",
  placeholder = "Ex: QPQ2+G88, 3093 Rte Lafrane, Sfax",
  className,
}: Props) {
  const lat = typeof latitude === "number" ? latitude : null;
  const lon = typeof longitude === "number" ? longitude : null;

  const { data, isLoading, isError } = useReverseGeocode(lat, lon);

  const [touchedAdresse, setTouchedAdresse] = useState(false);
  const lastAutoAdresseRef = useRef<string>("");

  const [touchedCp, setTouchedCp] = useState(false);
  const lastAutoCpRef = useRef<string>("");

  const plusCode = useMemo(() => {
    if (typeof lat !== "number" || typeof lon !== "number") return "";
    try {
      const encodeFn =
        typeof (olc as any).encode === "function"
          ? (olc as any).encode
          : (olc as any).OpenLocationCode?.encode;

      if (typeof encodeFn !== "function") return "";
      return encodeFn(lat, lon);
    } catch {
      return "";
    }
  }, [lat, lon]);

  const shortAddress = useMemo(() => formatShortAddress(data), [data]);

  const autoAdresse = useMemo(() => {
    const addr = isError ? "" : shortAddress;
    return buildAddressValue(plusCode, addr);
  }, [plusCode, shortAddress, isError]);

  const autoCodePostal = useMemo(() => {
    const cp = data?.address?.postcode ?? "";
    return (cp || "").trim();
  }, [data?.address?.postcode]);
  useEffect(() => {
    if (!autoFillIfEmpty) return;

    const canAutofill =
      (!touchedAdresse && value.trim().length === 0) || value === lastAutoAdresseRef.current;

    if (canAutofill && autoAdresse.trim().length > 0) {
      lastAutoAdresseRef.current = autoAdresse;
      onChange(autoAdresse);
    }
  }, [autoFillIfEmpty, touchedAdresse, value, autoAdresse, onChange]);
  useEffect(() => {
    if (!onCodePostalChange) return;
    if (!autoFillCodePostalIfEmpty) return;

    const current = (codePostalValue ?? "").trim();

    const canAutofill =
      (!touchedCp && current.length === 0) || current === lastAutoCpRef.current;

    if (canAutofill && autoCodePostal.length > 0) {
      lastAutoCpRef.current = autoCodePostal;
      onCodePostalChange(autoCodePostal);
    }
  }, [
    onCodePostalChange,
    autoFillCodePostalIfEmpty,
    touchedCp,
    codePostalValue,
    autoCodePostal,
  ]);

  const disabled = typeof lat !== "number" || typeof lon !== "number";

  return (
    <div className={className ?? ""}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none">{label}</label>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-xl px-3"
          disabled={disabled || isLoading}
          onClick={() => {
            const nextAdr = autoAdresse.trim();
            if (nextAdr.length > 0) {
              lastAutoAdresseRef.current = nextAdr;
              onChange(nextAdr);
              setTouchedAdresse(false);
            }

            if (onCodePostalChange) {
              const nextCp = autoCodePostal.trim();
              if (nextCp.length > 0) {
                lastAutoCpRef.current = nextCp;
                onCodePostalChange(nextCp);
                setTouchedCp(false);
              }
            }
          }}
        >
          Recalculer
        </Button>
      </div>

      <textarea
        className="mt-2 w-full rounded-xl border border-input/40 bg-muted/40 p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/50 transition-all"
        rows={3}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setTouchedAdresse(true);
          onChange(e.target.value);
        }}
      />

      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {disabled ? (
          <span>Choisis une position (lat/lng) pour remplir automatiquement.</span>
        ) : isLoading ? (
          <span>Recherche de l’adresse…</span>
        ) : isError ? (
          <span>Adresse indisponible (Nominatim). Plus Code utilisé si possible.</span>
        ) : (
          <span>Adresse détectée automatiquement (modifiable).</span>
        )}

        {plusCode ? (
          <span className="rounded-full border px-2 py-0.5">
            Plus Code: <span className="font-semibold">{plusCode}</span>
          </span>
        ) : null}

        {/* ✅ petit indicateur du CP détecté */}
        {autoCodePostal ? (
          <span className="rounded-full border px-2 py-0.5">
            CP détecté: <span className="font-semibold">{autoCodePostal}</span>
          </span>
        ) : null}
      </div>

      {/* ✅ Champ Code Postal optionnel (affiché seulement si on a branché les props) */}
      {onCodePostalChange ? (
        <div className="mt-3">
          <label className="text-sm font-medium leading-none">Code postal</label>
          <input
            className="mt-2 w-full rounded-xl border border-input/40 bg-muted/40 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/50 transition-all"
            value={codePostalValue ?? ""}
            disabled={disabled}
            onChange={(e) => {
              setTouchedCp(true);
              onCodePostalChange(e.target.value);
            }}
            placeholder="Ex: 3000"
          />
        </div>
      ) : null}
    </div>
  );
}