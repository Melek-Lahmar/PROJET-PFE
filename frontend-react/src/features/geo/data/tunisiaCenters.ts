export type MapCenter = { lat: number; lng: number; zoom: number };

const TUNISIA_DEFAULT: MapCenter = { lat: 34.0, lng: 9.0, zoom: 6 };

const gouvernoratCenters: Record<number, MapCenter> = {
  0: { lat: 36.8663, lng: 10.1647, zoom: 11 }, // Ariana
  1: { lat: 36.7256, lng: 9.1817, zoom: 11 },  // Beja
  2: { lat: 36.7531, lng: 10.2189, zoom: 11 }, // Ben Arous
  3: { lat: 37.2744, lng: 9.8739, zoom: 11 },  // Bizerte
  4: { lat: 33.8815, lng: 10.0982, zoom: 11 }, // Gabes
  5: { lat: 34.4250, lng: 8.7842, zoom: 11 },  // Gafsa
  6: { lat: 36.5011, lng: 8.7802, zoom: 11 },  // Jendouba
  7: { lat: 35.6781, lng: 10.0963, zoom: 11 }, // Kairouan
  8: { lat: 35.1676, lng: 8.8365, zoom: 11 },  // Kasserine
  9: { lat: 33.7044, lng: 8.9690, zoom: 11 },  // Kebili
  10: { lat: 36.1742, lng: 8.7049, zoom: 11 }, // Kef
  11: { lat: 35.5047, lng: 11.0622, zoom: 11 }, // Mahdia
  12: { lat: 36.8101, lng: 10.0956, zoom: 11 }, // Manouba
  13: { lat: 33.3549, lng: 10.5055, zoom: 11 }, // Medenine
  14: { lat: 35.7643, lng: 10.8113, zoom: 11 }, // Monastir
  15: { lat: 36.4561, lng: 10.7376, zoom: 11 }, // Nabeul
  16: { lat: 34.7406, lng: 10.7603, zoom: 11 }, // Sfax
  17: { lat: 35.0382, lng: 9.4849, zoom: 11 },  // Sidi Bouzid
  18: { lat: 36.0849, lng: 9.3708, zoom: 11 },  // Siliana
  19: { lat: 35.8256, lng: 10.6370, zoom: 11 }, // Sousse
  20: { lat: 32.9297, lng: 10.4518, zoom: 11 }, // Tataouine
  21: { lat: 33.9197, lng: 8.1335, zoom: 11 },  // Tozeur
  22: { lat: 36.8065, lng: 10.1815, zoom: 11 }, // Tunis
  23: { lat: 36.4029, lng: 10.1431, zoom: 11 }, // Zaghouan
};

export function getCenterForTunisia(
  gouvernorat: number | null | undefined
): MapCenter {
  if (typeof gouvernorat === "number") {
    return gouvernoratCenters[gouvernorat] ?? TUNISIA_DEFAULT;
  }

  return TUNISIA_DEFAULT;
}