import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { login } from "../api/authApi";
import { useAuthStore } from "../store/authStore";
import { SocialLoginButtons } from "../components/SocialLoginButtons";
import { resolvePostAuthRedirect, resolveSafeReturnTo } from "../utils/postAuthRedirect";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { PasswordInput } from "../../../shared/components/PasswordInput";

export function LoginPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const roles = useAuthStore((s) => s.roles);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const returnTo = resolveSafeReturnTo(searchParams.get("returnTo"));
  const registerHref = useMemo(
    () => (returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"),
    [returnTo]
  );

  useEffect(() => {
    if (!bootstrapped) return;
    if (isAuth) nav(resolvePostAuthRedirect(roles, returnTo), { replace: true });
  }, [bootstrapped, isAuth, roles, nav, returnTo]);

  const mutation = useMutation({
    mutationFn: () => login({ email, password }),
    onSuccess: (res: any) => {
      const token = res?.accessToken ?? res?.token ?? "";
      const expiresInMinutes = Number(res?.expiresInMinutes ?? res?.expiresMinutes ?? 60);
      const userId = res?.userId ?? res?.id ?? "";
      const userEmail = res?.email ?? email ?? "";
      const userRoles: string[] = Array.isArray(res?.roles) ? res.roles : [];

      setAuth({
        token,
        expiresInMinutes,
        userId,
        email: userEmail,
        roles: userRoles,
      });

      nav(resolvePostAuthRedirect(userRoles, returnTo), { replace: true });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="w-full max-w-md py-10">
      <div className="app-surface anim-fade-up overflow-hidden text-card-foreground shadow-[0_38px_110px_-55px_rgba(15,23,42,0.9)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-indigo-500 to-fuchsia-500" />

        <div className="space-y-6 px-8 py-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-xl font-black text-white shadow-[0_18px_38px_-24px_hsl(var(--primary)/0.8)]">
              E
            </div>
            <div className="app-kicker">Authentification</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-card-foreground">
              Connexion
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {returnTo === "/checkout"
                ? "Connectez-vous pour reprendre immédiatement votre checkout."
                : "Connectez-vous à votre compte pour accéder au catalogue et à vos commandes."}
            </p>
          </div>

          {returnTo === "/checkout" ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-card-foreground">
              Après connexion, vous serez redirigé directement vers la validation de commande.
            </div>
          ) : null}

          <SocialLoginButtons />

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemple.tn"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-card-foreground">
                  Mot de passe
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
              />
            </div>

            {mutation.isError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                Identifiants invalides ou erreur serveur.
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="h-12 w-full rounded-2xl text-base font-bold"
              isLoading={mutation.isPending}
              disabled={mutation.isPending}
            >
              Se connecter
            </Button>

            <div className="pt-1 text-center text-sm text-muted-foreground">
              Pas de compte ?{" "}
              <Link to={registerHref} className="font-semibold text-primary hover:underline">
                Créer un compte
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}