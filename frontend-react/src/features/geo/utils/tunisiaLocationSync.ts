import type { NominatimReverseResponse } from "../types/nominatim";
import type { GouvernoratItem } from "../types/geo";

export const TUNISIA_GOUVERNORATS = [
  "Ariana",
  "Beja",
  "BenArous",
  "Bizerte",
  "Gabes",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "Kebili",
  "Kef",
  "Mahdia",
  "Manouba",
  "Medenine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "SidiBouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan",
] as const;

export function getGouvernoratLabelById(value?: number | null) {
  return typeof value === "number" && value >= 0 && value < TUNISIA_GOUVERNORATS.length
    ? TUNISIA_GOUVERNORATS[value]
    : null;
}

export function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function normalizeLookup(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .trim()
    .toLowerCase();
}

function uniqueNonEmpty(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => (value ?? "").trim()).filter(Boolean)));
}

function getReverseCandidates(reverse?: NominatimReverseResponse | null) {
  const address = reverse?.address;

  return uniqueNonEmpty([
    address?.state,
    address?.county,
    address?.city,
    address?.town,
    address?.village,
    address?.suburb,
    address?.neighbourhood,
    reverse?.display_name,
  ]);
}

export function resolveGouvernoratIdFromReverse(
  reverse?: NominatimReverseResponse | null,
  gouvernorats: GouvernoratItem[] = TUNISIA_GOUVERNORATS.map((name, id) => ({ id, name }))
) {
  const candidates = getReverseCandidates(reverse).map(normalizeLookup);
  if (candidates.length === 0) return null;

  for (const gouvernorat of gouvernorats) {
    const normalizedGov = normalizeLookup(gouvernorat.name);
    if (candidates.some((candidate) => candidate === normalizedGov || candidate.includes(normalizedGov) || normalizedGov.includes(candidate))) {
      return gouvernorat.id;
    }
  }

  return null;
}

export function resolveDelegationFromReverse(
  reverse: NominatimReverseResponse | null | undefined,
  delegations: string[]
) {
  if (!reverse || delegations.length === 0) return null;

  const candidates = uniqueNonEmpty([
    reverse.address?.city,
    reverse.address?.town,
    reverse.address?.village,
    reverse.address?.suburb,
    reverse.address?.neighbourhood,
    reverse.address?.county,
    reverse.display_name,
  ]).map(normalizeLookup);

  for (const delegation of delegations) {
    const normalizedDelegation = normalizeLookup(delegation);
    if (!normalizedDelegation) continue;

    const matched = candidates.some(
      (candidate) =>
        candidate === normalizedDelegation ||
        candidate.includes(normalizedDelegation) ||
        normalizedDelegation.includes(candidate)
    );

    if (matched) return delegation;
  }

  return null;
}

export function extractPostalCode(reverse?: NominatimReverseResponse | null) {
  return (reverse?.address?.postcode ?? "").trim();
}

export function buildAddressFromReverse(reverse?: NominatimReverseResponse | null) {
  const address = reverse?.address;
  const street = [address?.house_number, address?.road].filter(Boolean).join(" ").trim();
  const locality = uniqueNonEmpty([
    address?.neighbourhood,
    address?.suburb,
    address?.city ?? address?.town ?? address?.village,
  ]);

  const parts = uniqueNonEmpty([
    street,
    ...locality,
  ]);

  if (parts.length > 0) return parts.join(", ");

  const displayName = (reverse?.display_name ?? "").trim();
  if (!displayName) return "";

  return displayName
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");
}
