import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

// ============================================================
// IMPORTS - Geo & Map
// ============================================================
import { IconPin } from "../../assets/icons/IconPin";
import { AddressMapModal } from "../../auth/components/AddressMapModal";
import { reverseGeocodeNominatim } from "../../geo/api/nominatimApi";
import {
  resolveGouvernoratIdFromReverse,
  resolveDelegationFromReverse,
} from "../../geo/utils/tunisiaLocationSync";
import { getDelegations, getGouvernorats } from "../../geo/api/geoApi";
import { TUNISIA_GOUVERNORATS } from "../../geo/constants/tunisiaGouvernorats";

// ============================================================
// Types
// ============================================================
interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  gouvernorat: string | null;
  delegation: string | null;
  address: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
}

// ============================================================
// RegisterPage Component
// ============================================================
export function RegisterPage() {
  // ────────────────────────────────────────────────────────
  // État - Form Fields
  // ────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gouvernorat, setGouvernorat] = useState<string | null>(null);
  const [delegation, setDelegation] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // ────────────────────────────────────────────────────────
  // État - Map Modal & GPS
  // ────────────────────────────────────────────────────────
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSyncMsg, setMapSyncMsg] = useState<string>("");
  const [mapLocating, setMapLocating] = useState(false);

  // Safe values (with type narrowing)
  const safeLatitude = latitude !== null ? latitude : null;
  const safeLongitude = longitude !== null ? longitude : null;

  // ────────────────────────────────────────────────────────
  // Queries - Récupérer gouvernorats depuis API
  // ────────────────────────────────────────────────────────
  const govQuery = useQuery({
    queryKey: ["gouvernorats"],
    queryFn: getGouvernorats,
  });

  // ────────────────────────────────────────────────────────
  // Mutations
  // ────────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      // À adapter selon votre API
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Registration failed");
      return response.json();
    },
  });

  // ────────────────────────────────────────────────────────
  // Fonctions - GPS & Geolocation
  // ────────────────────────────────────────────────────────
  const getMyPosition = useCallback(async () => {
    setMapLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude: lat, longitude: lng } = position.coords;
      await handleMapPick(lat, lng);
    } catch (error) {
      setMapSyncMsg("Impossible d'accéder à votre position GPS.");
      console.error("Geolocation error:", error);
    } finally {
      setMapLocating(false);
    }
  }, []);

  // ────────────────────────────────────────────────────────
  // Fonctions - Map Pick Handler
  // ────────────────────────────────────────────────────────
  const handleMapPick = useCallback(
    async (lat: number, lng: number) => {
      setLatitude(Number(lat.toFixed(6)));
      setLongitude(Number(lng.toFixed(6)));
      setMapSyncMsg("Analyse de la position…");
      try {
        const result = await reverseGeocodeNominatim(lat, lng);

        // Récupérer les gouvernorats depuis la query
        const govs = govQuery.data ?? [];
        
        // ✅ CORRECTION: Passer les gouvernorats correctement à la fonction
        // La fonction attend un array de gouvernorats avec { id, name }
        const govId = govs && govs.length > 0
          ? resolveGouvernoratIdFromReverse(result, govs)
          : null;

        if (govId !== null) {
          setGouvernorat(String(govId));
        }

        // Résoudre la délégation
        const delegList = govId !== null
          ? await (async () => {
              return getDelegations(govId).catch(() => []);
            })()
          : [];
        const resolvedDeleg = resolveDelegationFromReverse(result, delegList);
        if (resolvedDeleg) setDelegation(resolvedDeleg);

        // Utiliser la constante pour afficher le nom du gouvernorat
        const govName = govId !== null ? TUNISIA_GOUVERNORATS[govId] ?? "" : "";

        setMapSyncMsg(
          `✅ Position épinglée · ${govName}${resolvedDeleg ? ` · ${resolvedDeleg}` : ""}`
        );
      } catch (error) {
        setMapSyncMsg("Position enregistrée. Vérifiez le gouvernorat et la délégation.");
        console.error("Reverse geocode error:", error);
      }
    },
    [govQuery.data]
  );

  // ────────────────────────────────────────────────────────
  // Fonctions - Form Submission
  // ────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMapSyncMsg("Les mots de passe ne correspondent pas.");
      return;
    }

    const formData: RegisterFormData = {
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      gouvernorat,
      delegation,
      address,
      postalCode,
      latitude,
      longitude,
    };

    registerMutation.mutate(formData);
  };

  // ────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-lg p-8">
          {/* En-tête */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Créer un compte
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Remplissez le formulaire pour vous inscrire
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identité */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Prénom
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition"
                  placeholder="Jean"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition"
                  placeholder="Dupont"
                  required
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition"
                  placeholder="jean@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition"
                  placeholder="+216 20 000 000"
                  required
                />
              </div>
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Adresse
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition"
                placeholder="123 Rue de la Paix"
              />
            </div>

            {/* Gouvernorat & Délégation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Gouvernorat
                </label>
                <select
                  value={gouvernorat || ""}
                  onChange={(e) => setGouvernorat(e.target.value || null)}
                  disabled={govQuery.isPending}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {govQuery.isPending ? "Chargement..." : "Sélectionner..."}
                  </option>
                  {govQuery.data?.map((gov) => (
                    <option key={gov.id} value={gov.id}>
                      {gov.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Délégation
                </label>
                <select
                  value={delegation || ""}
                  onChange={(e) => setDelegation(e.target.value || null)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition"
                >
                  <option value="">Sélectionner...</option>
                  {/* À remplir avec les délégations */}
                </select>
              </div>
            </div>

            {/* Code Postal */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Code postal
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition"
                placeholder="1000"
              />
            </div>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {/* GÉOLOCALISATION - Boutons GPS + Carte */}
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="md:col-span-2 space-y-2">
              {/* Les deux boutons côte à côte */}
              <div className="flex flex-wrap gap-2">
                {/* Bouton GPS existant */}
                <button
                  type="button"
                  onClick={getMyPosition}
                  disabled={mapLocating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <IconPin className="h-4 w-4" />
                  {safeLatitude !== null && safeLongitude !== null
                    ? "Position GPS détectée"
                    : "Utiliser ma position (GPS)"}
                </button>

                {/* Nouveau bouton carte */}
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
                    <line x1="9" y1="4" x2="9" y2="17" />
                    <line x1="15" y1="7" x2="15" y2="20" />
                  </svg>
                  Épingler sur la carte
                </button>
              </div>

              {/* Indicateurs d'état */}
              {(safeLatitude !== null || mapSyncMsg) && (
                <div className="flex flex-wrap items-center gap-2">
                  {safeLatitude !== null && safeLongitude !== null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      📍 {safeLatitude.toFixed(4)}, {safeLongitude.toFixed(4)}
                      <button
                        type="button"
                        onClick={() => {
                          setLatitude(null);
                          setLongitude(null);
                          setMapSyncMsg("");
                        }}
                        className="ml-1 text-emerald-400 hover:text-rose-500 transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {mapSyncMsg && (
                    <span
                      className={`text-[11px] font-medium ${
                        mapSyncMsg.startsWith("✅")
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {mapSyncMsg}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Mot de passe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Bouton d'envoi */}
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-center transition hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {registerMutation.isPending ? "Inscription en cours..." : "S'inscrire"}
            </button>

            {/* Messages d'erreur */}
            {registerMutation.isError && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm">
                Une erreur est survenue lors de l'inscription. Veuillez réessayer.
              </div>
            )}
          </form>

          {/* Lien vers connexion */}
          <p className="mt-6 text-center text-slate-600 dark:text-slate-400">
            Vous avez déjà un compte?{" "}
            <a href="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Se connecter
            </a>
          </p>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL DE CARTE */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AddressMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        gouvernorat={gouvernorat}
        delegation={delegation}
        latitude={safeLatitude}
        longitude={safeLongitude}
        onChange={(lat, lng) => {
          void handleMapPick(lat, lng);
          setMapOpen(false);
        }}
      />
    </div>
  );
}

export default RegisterPage;
