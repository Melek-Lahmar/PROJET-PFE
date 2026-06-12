/**
 * Convertit n'importe quelle erreur (Axios, réseau, timeout, ProblemDetails
 * ASP.NET, HTML brut…) en un **message clair en français** destiné à
 * l'utilisateur final.
 *
 * Ordre de priorité :
 *  1. Pas de réponse serveur → réseau / timeout / annulation.
 *  2. Message métier explicite du serveur (`message` / `errorMessage`).
 *  3. Erreurs de validation ASP.NET (`title` + `errors`).
 *  4. Corps texte/HTML.
 *  5. Repli générique selon le code HTTP (401/403/404/5xx…).
 *
 * Utilisé partout (128+ sites) via les hooks/queries — c'est le point unique
 * de traduction des erreurs côté React.
 */
export function getApiErrorMessage(err: unknown): string {
  const e = err as {
    code?: string;
    message?: string;
    request?: unknown;
    response?: { status?: number; data?: unknown };
  };
  const response = e?.response;
  const data = response?.data as
    | { message?: unknown; errorMessage?: unknown; title?: unknown; errors?: unknown }
    | string
    | undefined;

  // 1) Aucune réponse HTTP reçue → couche réseau.
  if (!response) {
    const code = e?.code ?? "";
    const msg = (e?.message ?? "").toLowerCase();
    if (code === "ECONNABORTED" || msg.includes("timeout")) {
      return "Le serveur met trop de temps à répondre. Réessayez.";
    }
    if (code === "ERR_CANCELED" || code === "CanceledError") {
      return "Requête annulée.";
    }
    if (code === "ERR_NETWORK" || msg.includes("network error") || e?.request) {
      return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
    }
  }

  // 2) Message métier renvoyé par l'API (prioritaire — conflits, règles métier…).
  if (data && typeof data === "object") {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();

    const errorMessage = (data as { errorMessage?: unknown }).errorMessage;
    if (typeof errorMessage === "string" && errorMessage.trim()) {
      return errorMessage.trim();
    }

    // 3) ProblemDetails / erreurs de validation ASP.NET.
    const title = (data as { title?: unknown }).title;
    if (typeof title === "string" && title.trim()) {
      const errors = (data as { errors?: unknown }).errors;
      if (errors && typeof errors === "object") {
        const keys = Object.keys(errors as Record<string, unknown>);
        if (keys.length > 0) {
          const first = (errors as Record<string, unknown>)[keys[0]];
          if (Array.isArray(first) && first.length > 0) {
            return `${title}: ${first[0]}`;
          }
        }
      }
      return title;
    }
  }

  // 4) Corps texte brut (parfois du HTML d'erreur serveur).
  if (typeof data === "string") {
    const text = data
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.toLowerCase().includes("nullable object must have a value")) {
      return "Erreur serveur catalogue : certaines lignes article/stock contiennent des valeurs nulles en base.";
    }
    if (text) return text.length > 220 ? `${text.slice(0, 217)}...` : text;
  }

  // 5) Repli selon le code HTTP quand le serveur n'a pas fourni de message.
  const status = response?.status;
  if (typeof status === "number") {
    switch (status) {
      case 400:
        return "Requête invalide. Vérifiez les informations saisies.";
      case 401:
        return "Session expirée. Veuillez vous reconnecter.";
      case 403:
        return "Vous n'avez pas la permission d'effectuer cette action.";
      case 404:
        return "Ressource introuvable.";
      case 408:
        return "Délai d'attente dépassé. Réessayez.";
      case 409:
        return "Conflit : ces données ont déjà été modifiées. Rechargez la page.";
      case 422:
        return "Les données envoyées sont invalides.";
      case 429:
        return "Trop de requêtes. Patientez quelques instants.";
      default:
        if (status >= 500) {
          return "Erreur serveur. Réessayez dans un instant.";
        }
    }
  }

  const fallback = e?.message ?? "";
  if (typeof fallback === "string" && fallback.toLowerCase().includes("status code 500")) {
    return "Erreur serveur. Réessayez dans un instant.";
  }
  return fallback.trim() || "Une erreur est survenue. Réessayez.";
}
