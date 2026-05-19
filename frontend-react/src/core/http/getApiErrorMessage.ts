export function getApiErrorMessage(err: unknown): string {
  const e = err as any;
  const data = e?.response?.data;

  if (data?.message && typeof data.message === "string") {
    return data.message;
  }

  if (data?.title && typeof data.title === "string") {
    const errors = data?.errors;
    if (errors && typeof errors === "object") {
      const keys = Object.keys(errors);
      if (keys.length > 0) {
        const k = keys[0];
        const v = errors[k];
        if (Array.isArray(v) && v.length > 0) {
          return `${data.title}: ${v[0]}`;
        }
      }
    }
    return data.title;
  }

  if (typeof data === "string") {
    const text = data
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.toLowerCase().includes("nullable object must have a value")) {
      return "Erreur serveur catalogue : certaines lignes article/stock contiennent des valeurs nulles en base.";
    }

    return text.length > 220 ? `${text.slice(0, 217)}...` : text;
  }

  const message = e?.message || "Erreur inconnue.";

  if (typeof message === "string" && message.toLowerCase().includes("status code 500")) {
    return "Erreur serveur catalogue : la pagination a échoué côté API.";
  }

  return message;
}