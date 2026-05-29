import L from "leaflet";

type MapPinReason = "gps" | "map_drag" | "map_click" | null;

export function createMapPin(reason: MapPinReason = null) {
  const color = reason === "gps" ? "#2563eb" : "#7c3aed";

  return L.divIcon({
    className: "",
    html: `
      <div style="width:28px;height:28px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 8px 20px rgba(15,23,42,.22);display:flex;align-items:center;justify-content:center;">
        <div style="width:8px;height:8px;border-radius:999px;background:white;"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}
