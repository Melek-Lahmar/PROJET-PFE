import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../shared/components/Button";
import { loginWithProvider } from "../api/externalAuth";
import { useAuthStore } from "../store/authStore";

function postAuthRedirect(roles: string[]) {
  const r = (roles ?? []).map((x) => String(x).toUpperCase());

  if (r.includes("ADMIN")) return "/admin";
  if (r.includes("CONFIRMATEUR")) return "/confirmateur/commandes";
  if (r.includes("LIVREUR")) return "/livreur/bl";

  return "/articles";
}

function normalizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((x) => String(x)).filter(Boolean);
}

function normalizeExternalAuthResponse(res: any) {
  const roles = normalizeRoles(res?.roles ?? res?.Roles);

  return {
    accessToken: String(res?.accessToken ?? res?.AccessToken ?? ""),
    expiresInMinutes: Number(res?.expiresInMinutes ?? res?.ExpiresInMinutes ?? 60),
    userId: String(res?.userId ?? res?.UserId ?? ""),
    email: String(res?.email ?? res?.Email ?? ""),
    roles,
  };
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path d="M44.5 20H24v8.5h11.8C34.3 33.7 29.7 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.5 0 6.7 1.4 9 3.7l6-6C35.4 5.3 30 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c12 0 20.8-8.4 20.8-20.8 0-1.4-.1-2.4-.3-3.2z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8.1V12h2.3V9.8c0-2.3 1.4-3.6 3.5-3.6 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.5.7-1.5 1.4V12h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12z" />
    </svg>
  );
}

export function SocialLoginButtons() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [loading, setLoading] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doLogin(provider: "google" | "facebook") {
    try {
      setError(null);
      setLoading(provider);

      const raw = await loginWithProvider(provider);
      const res = normalizeExternalAuthResponse(raw);

      if (!res.accessToken || !res.userId || !res.email) {
        throw new Error("Réponse OAuth invalide reçue depuis le backend.");
      }

      setAuth({
        token: res.accessToken,
        expiresInMinutes: res.expiresInMinutes,
        userId: res.userId,
        email: res.email,
        roles: res.roles,
      });

      nav(postAuthRedirect(res.roles), { replace: true });
    } catch (e: any) {
      setError(e?.message ?? "Erreur OAuth");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3">
        <Button
          variant="outline"
          className="h-12 w-full justify-center gap-3 rounded-2xl"
          onClick={() => doLogin("google")}
          isLoading={loading === "google"}
          disabled={!!loading}
        >
          <GoogleIcon />
          Continuer avec Google
        </Button>

        <Button
          variant="outline"
          className="h-12 w-full justify-center gap-3 rounded-2xl"
          onClick={() => doLogin("facebook")}
          isLoading={loading === "facebook"}
          disabled={!!loading}
        >
          <FacebookIcon />
          Continuer avec Facebook
        </Button>
      </div>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/70" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">ou</span>
        </div>
      </div>
    </div>
  );
}