import { useEffect } from "react";
import { usePublicSettings } from "../../../shared/hooks/usePublicSettings";
import { DEFAULT_SHIPPING_HOME, useCartStore } from "../../cart/store/cartStore";

function toPositiveNumber(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function PublicSettingsBootstrapper() {
  const { get } = usePublicSettings();
  const setShippingHomeFee = useCartStore((s) => s.setShippingHomeFee);
  const deliveryFee = get<unknown>("checkout.deliveryFee.home", DEFAULT_SHIPPING_HOME);

  useEffect(() => {
    setShippingHomeFee(toPositiveNumber(deliveryFee, DEFAULT_SHIPPING_HOME));
  }, [deliveryFee, setShippingHomeFee]);

  return null;
}
