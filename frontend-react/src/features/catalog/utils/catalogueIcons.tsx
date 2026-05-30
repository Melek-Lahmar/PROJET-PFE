import type { SVGProps } from "react";

export type CatalogueIconKey =
  | "audio"
  | "battery"
  | "office"
  | "gaming"
  | "network"
  | "security"
  | "phone"
  | "computer"
  | "cable"
  | "peripheral"
  | "webcam"
  | "generic";

type KeywordRule = {
  key: CatalogueIconKey;
  keywords: string[];
};

const KEYWORD_RULES: KeywordRule[] = [
  { key: "webcam", keywords: ["webcam"] },
  { key: "audio", keywords: ["audio", "son", "casque", "ecouteur", "enceinte", "micro"] },
  { key: "battery", keywords: ["batterie", "batteries", "chargeur", "chargeurs", "alimentation"] },
  { key: "office", keywords: ["bureau", "bureautique", "impression", "imprimante", "scanner", "copieur"] },
  { key: "gaming", keywords: ["gaming", "jeu", "jeux", "game", "console", "manette"] },
  { key: "network", keywords: ["reseau", "wifi", "wi-fi", "routeur", "switch", "modem", "ethernet"] },
  { key: "security", keywords: ["securite", "camera", "surveillance", "alarme", "controle"] },
  { key: "phone", keywords: ["telephone", "telephonie", "mobile", "smartphone", "gsm"] },
  { key: "cable", keywords: ["cable", "cables", "cordon", "connectique", "adaptateur", "hub"] },
  { key: "peripheral", keywords: ["souris", "clavier", "claviers", "peripherique", "peripheriques"] },
  { key: "computer", keywords: ["informatique", "ordinateur", "ordinateurs", "accessoire", "accessoires", "laptop", "portable", "pc"] },
];

const SHORT_KEYWORDS = new Set(["pc"]);

export function normalizeCatalogueIconText(value: string | null | undefined) {
  return (value ?? "")
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsKeyword(normalizedText: string, keyword: string) {
  if (!normalizedText) return false;
  if (SHORT_KEYWORDS.has(keyword)) {
    return normalizedText.split(/[^a-z0-9]+/).includes(keyword);
  }
  return normalizedText.includes(keyword);
}

export function getCatalogueIconKey(name: string | null | undefined): CatalogueIconKey {
  const normalizedName = normalizeCatalogueIconText(name);
  const rule = KEYWORD_RULES.find(({ keywords }) =>
    keywords.some((keyword) => containsKeyword(normalizedName, keyword)),
  );

  return rule?.key ?? "generic";
}

export function CatalogueIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const key = getCatalogueIconKey(name);
  const props: SVGProps<SVGSVGElement> = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (key) {
    case "audio":
      return (
        <svg {...props}>
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <path d="M4 14a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3Z" />
          <path d="M20 14a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3Z" />
        </svg>
      );
    case "battery":
      return (
        <svg {...props}>
          <rect x="3" y="7" width="16" height="10" rx="2" />
          <path d="M21 11v2" />
          <path d="M8 11h3" />
          <path d="M9.5 9.5 8 12h3l-1.5 2.5" />
        </svg>
      );
    case "office":
      return (
        <svg {...props}>
          <path d="M7 9V4h10v5" />
          <rect x="6" y="14" width="12" height="6" rx="1.5" />
          <rect x="4" y="9" width="16" height="7" rx="2" />
          <path d="M8 18h8" />
          <path d="M17 12h.01" />
        </svg>
      );
    case "gaming":
      return (
        <svg {...props}>
          <path d="M7 15h-1.5a3.5 3.5 0 0 1 0-7H8l2 2h4l2-2h2.5a3.5 3.5 0 0 1 0 7H17l-2-2H9l-2 2Z" />
          <path d="M7 10v3" />
          <path d="M5.5 11.5h3" />
          <path d="M16.5 11h.01" />
          <path d="M18.5 13h.01" />
        </svg>
      );
    case "network":
      return (
        <svg {...props}>
          <rect x="9" y="3" width="6" height="6" rx="1.5" />
          <rect x="3" y="15" width="6" height="6" rx="1.5" />
          <rect x="15" y="15" width="6" height="6" rx="1.5" />
          <path d="M12 9v3" />
          <path d="M6 15v-3h12v3" />
        </svg>
      );
    case "security":
      return (
        <svg {...props}>
          <path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "phone":
      return (
        <svg {...props}>
          <rect x="7" y="2.5" width="10" height="19" rx="2" />
          <path d="M10 6h4" />
          <path d="M12 18h.01" />
        </svg>
      );
    case "computer":
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="11" rx="2" />
          <path d="M8 20h8" />
          <path d="M12 16v4" />
        </svg>
      );
    case "cable":
      return (
        <svg {...props}>
          <path d="M7 7 5 5" />
          <path d="M9 5 5 9" />
          <path d="M17 17 19 19" />
          <path d="M15 19 19 15" />
          <path d="M8 8 16 16" />
          <path d="M10 14a4 4 0 0 1 0-8" />
          <path d="M14 10a4 4 0 0 1 0 8" />
        </svg>
      );
    case "peripheral":
      return (
        <svg {...props}>
          <rect x="4" y="5" width="16" height="10" rx="2" />
          <path d="M7 9h.01" />
          <path d="M10 9h.01" />
          <path d="M13 9h.01" />
          <path d="M16 9h.01" />
          <path d="M8 12h8" />
          <path d="M9 19h6" />
        </svg>
      );
    case "webcam":
      return (
        <svg {...props}>
          <circle cx="12" cy="10" r="5" />
          <circle cx="12" cy="10" r="1.5" />
          <path d="M8 21h8" />
          <path d="M12 15v6" />
        </svg>
      );
    case "generic":
      return (
        <svg {...props}>
          <rect x="4" y="4" width="6" height="6" rx="1.5" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" />
        </svg>
      );
  }
}
