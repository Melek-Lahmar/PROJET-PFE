import { useEffect, useMemo, useState, type SVGProps } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { login } from "../api/authApi";
import { useAuthStore } from "../store/authStore";
import { SocialLoginButtons } from "../components/SocialLoginButtons";
import { resolvePostAuthRedirect, resolveSafeReturnTo } from "../utils/postAuthRedirect";
import { AuthSplitShell, BrandMark } from "../components/AuthSplitShell";

import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { PasswordInput } from "../../../shared/components/PasswordInput";

function IconMail(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">{children}</div>;
}

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
    <AuthSplitShell screen="login">
      <div className="w-full max-w-[420px]">
        <div className="text-center">
          <BrandMark />
          <div className="mt-6 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Authentification
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-slate-950 dark:text-white">
            Connexion
          </h1>
          <p className="mx-auto mt-3 max-w-[330px] text-sm leading-6 text-slate-600 dark:text-slate-300">
            {returnTo === "/checkout"
              ? "Connectez-vous pour reprendre immédiatement votre checkout."
              : "Connectez-vous à votre compte pour accéder au catalogue et à vos commandes."}
          </p>
        </div>

        {returnTo === "/checkout" ? (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
            Après connexion, vous serez redirigé directement vers la validation de commande.
          </div>
        ) : null}

        <div className="mt-6">
          <SocialLoginButtons />
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-extrabold text-slate-900 dark:text-white">Email</label>
            <div className="relative">
              <FieldIcon>
                <IconMail className="h-5 w-5" />
              </FieldIcon>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemple.tn"
                autoComplete="email"
                className="h-12 rounded-2xl border-slate-200 bg-white pl-12 shadow-none dark:border-white/10 dark:bg-slate-900/70"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-extrabold text-slate-900 dark:text-white">
                Mot de passe
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-extrabold text-blue-600 transition hover:text-blue-700 hover:underline dark:text-blue-300"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-12 rounded-2xl border-slate-200 bg-white shadow-none dark:border-white/10 dark:bg-slate-900/70"
            />
          </div>

          {mutation.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
              Identifiants invalides ou erreur serveur.
            </div>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            className="h-[52px] w-full rounded-2xl bg-[linear-gradient(135deg,#0f63ff,#4f46e5)] text-base font-black shadow-[0_24px_55px_-26px_rgba(37,99,235,0.95)]"
            isLoading={mutation.isPending}
            disabled={mutation.isPending}
          >
            Se connecter
          </Button>

          <div className="pt-1 text-center text-sm font-medium text-slate-500 dark:text-slate-300">
            Pas de compte ?{" "}
            <Link to={registerHref} className="font-black text-blue-600 hover:underline dark:text-blue-300">
              Créer un compte
            </Link>
          </div>
        </form>
      </div>
    </AuthSplitShell>
  );
}