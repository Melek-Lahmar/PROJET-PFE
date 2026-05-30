import { useState } from "react";
import { axiosClient } from "../../../core/http/axiosClient";
import { endpoints } from "../../../core/http/endpoints";

type Props = {
  gouvernorat: string;
  delegation: string;
  onValidated?: (payload: { status: string; latitude: number; longitude: number }) => void;
};

export function GpsValidatorSection({ gouvernorat, delegation, onValidated }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("Position non validée.");

  async function validate(latitude: number, longitude: number) {
    setStatus("loading");
    try {
      const { data } = await axiosClient.post(endpoints.geoValidatePoint, { latitude, longitude, gouvernorat, delegation });
      const normalized = (data?.status ?? data?.geoValidationStatus ?? "Unknown").toString();
      if (normalized === "Ok") {
        setStatus("ok");
        setMessage("Position validée dans la délégation sélectionnée.");
        onValidated?.({ status: normalized, latitude, longitude });
      } else {
        setStatus("error");
        setMessage(data?.message ?? "La position ne correspond pas à la délégation sélectionnée.");
      }
    } catch {
      setStatus("error");
      setMessage("Validation GPS impossible. Réessayez ou placez le pin sur la carte.");
    }
  }

  function detect() {
    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("La géolocalisation n’est pas supportée par ce navigateur.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => void validate(pos.coords.latitude, pos.coords.longitude),
      () => {
        setStatus("error");
        setMessage("Permission GPS refusée. Utilisez le mode pin sur carte.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">📍 Confirmez votre position</h3>
          <p className="text-sm text-muted-foreground">Le client voit uniquement un voyant vert/rouge, jamais les coordonnées GPS.</p>
        </div>
        <span className={status === "ok" ? "badge-success" : status === "error" ? "badge-danger" : "badge-muted"}>{status === "ok" ? "Vert" : status === "error" ? "Rouge" : "En attente"}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={detect} className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:bg-primary/90">🛰 Détecter automatiquement</button>
        <button type="button" className="rounded-xl border border-border bg-card px-4 py-2 font-semibold text-card-foreground transition hover:bg-accent hover:text-primary" onClick={() => setMessage("Mode pin prêt : branchez MapPinPicker pour choisir la position.")}>🗺 Placer sur la carte</button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{status === "loading" ? "Validation en cours..." : message}</p>
    </section>
  );
}
