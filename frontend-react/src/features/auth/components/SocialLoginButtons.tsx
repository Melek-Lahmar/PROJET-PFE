import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithProvider } from "../api/externalAuth";
import { useAuthStore } from "../store/authStore";

function postAuthRedirect(roles: string[]) {
  const r = (roles ?? []).map((x) => String(x).toUpperCase());

  if (r.includes("ADMIN")) return "/admin";
  if (r.includes("SUPERVISEUR")) return "/supervisor/zones";
  if (r.includes("CONFIRMATEUR")) return "/confirmateur/commandes";
  if (r.includes("LIVREUR")) return "/livreur/bl";
  if (r.includes("VENDEUR")) return "/vendeur/articles";

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
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.2 4 9.4 8.5 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-7.9l-6.6 5.1C9.2 39.6 16 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.3-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.88 3.77-3.88 1.09 0 2.23.2 2.23.2v2.45h-1.25c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
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
        <div className="auth-error-message rounded-2xl px-4 py-3 text-sm font-semibold">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          onClick={() => doLogin("facebook")}
          disabled={!!loading}
          className="auth-facebook-button inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border px-5 text-sm font-extrabold shadow-[0_20px_46px_-24px_rgba(24,119,242,0.95)] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
        >
          {loading === "facebook" ? <Spinner /> : <FacebookIcon />}
          Continuer avec Facebook
        </button>

        <button
          type="button"
          onClick={() => doLogin("google")}
          disabled={!!loading}
          className="auth-google-button inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border px-5 text-sm font-extrabold shadow-[0_18px_44px_-30px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
        >
          {loading === "google" ? <Spinner /> : <GoogleIcon />}
          Continuer avec Google
        </button>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="auth-divider-line h-px w-full" />
        </div>

        <div className="relative flex justify-center">
          <span className="auth-divider-chip px-4 text-xs font-black uppercase tracking-[0.18em]">
            ou
          </span>
        </div>
      </div>
    </div>
  );
}