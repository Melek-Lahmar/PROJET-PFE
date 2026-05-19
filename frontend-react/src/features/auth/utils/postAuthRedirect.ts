function normalizeRoles(roles: string[]) {
  return (roles ?? []).map((role) => String(role).toUpperCase());
}

export function resolveSafeReturnTo(raw?: string | null) {
  if (!raw) return null;

  const trimmed = raw.trim();

  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;

  const forbiddenPrefixes = ["/login", "/register", "/forgot-password"];
  if (forbiddenPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return null;
  }

  return trimmed;
}

export function resolvePostAuthRedirect(roles: string[], returnTo?: string | null) {
  const normalized = normalizeRoles(roles);

  if (normalized.includes("ADMIN")) return "/admin";
  if (normalized.includes("SUPERVISEUR")) return "/supervisor/zones";
  if (normalized.includes("CONFIRMATEUR")) return "/confirmateur/commandes";
  if (normalized.includes("LIVREUR")) return "/livreur/bl";
  if (normalized.includes("VENDEUR")) return "/vendeur/articles";

  return resolveSafeReturnTo(returnTo) ?? "/articles";
}