import { env } from "../../../core/config/env";
import type { AuthResponseDto } from "../types/auth";

const API_BASE = env.apiBaseUrl;
const BACKEND_ORIGIN = env.apiOrigin;

export type Provider = "google" | "facebook";

export function loginWithProvider(provider: Provider): Promise<AuthResponseDto> {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/api/auth/external/${provider}`;

    const w = 520;
    const h = 650;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;

    const popup = window.open(
      url,
      "melek-oauth",
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Popup bloquée. Active les popups pour ce site."));
      return;
    }

    const timer = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("Popup fermée."));
      }
    }, 400);

    function cleanup() {
      window.clearInterval(timer);
      window.removeEventListener("message", onMessage);

      if (popup && !popup.closed) {
        try {
          popup.close();
        } catch {
        }
      }
    }

    function onMessage(ev: MessageEvent) {
      if (ev.origin !== BACKEND_ORIGIN) return;

      const data = ev.data as { type?: string; payload?: unknown };

      if (data?.type === "OAUTH_LOGIN_SUCCESS") {
        cleanup();
        resolve(data.payload as AuthResponseDto);
        return;
      }

      if (data?.type === "OAUTH_LOGIN_ERROR") {
        cleanup();
        reject(new Error((data.payload as { message?: string } | undefined)?.message ?? "OAuth error"));
      }
    }

    window.addEventListener("message", onMessage);
  });
}