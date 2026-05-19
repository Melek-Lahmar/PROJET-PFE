import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { resetPassword } from "../api/authApi";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { Button } from "../../../shared/components/Button";
import { PasswordInput } from "../../../shared/components/PasswordInput";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();

  const email = (searchParams.get("email") ?? "").trim();
  const token = (searchParams.get("token") ?? "").trim();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const isLinkValid = useMemo(() => Boolean(email && token), [email, token]);

  const mutation = useMutation({
    mutationFn: () =>
      resetPassword({
        email,
        token,
        newPassword,
      }),
    onSuccess: (res) => {
      setClientError(null);
      setSuccessMessage(
        res?.message ?? "Votre mot de passe a été réinitialisé avec succès."
      );
      setNewPassword("");
      setConfirmPassword("");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setSuccessMessage(null);
    setClientError(null);

    if (!isLinkValid) {
      setClientError("Lien de réinitialisation invalide ou incomplet.");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setClientError("Veuillez renseigner et confirmer le nouveau mot de passe.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setClientError("Les mots de passe ne correspondent pas.");
      return;
    }

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
            <div className="app-kicker">Sécurisation du compte</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-card-foreground">
              Réinitialiser le mot de passe
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choisissez un nouveau mot de passe pour finaliser la récupération de votre
              compte.
            </p>
          </div>

          {!isLinkValid ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              Le lien de réinitialisation est invalide ou incomplet. Veuillez recommencer
              depuis la page “Mot de passe oublié”.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Réinitialisation pour <span className="font-semibold">{email}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">
                Nouveau mot de passe
              </label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={!isLinkValid || mutation.isPending || Boolean(successMessage)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-card-foreground">
                Confirmer le mot de passe
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={!isLinkValid || mutation.isPending || Boolean(successMessage)}
              />
            </div>

            {clientError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {clientError}
              </div>
            ) : null}

            {mutation.isError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {getApiErrorMessage(mutation.error)}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="h-12 w-full rounded-2xl text-base font-bold"
              isLoading={mutation.isPending}
              disabled={!isLinkValid || mutation.isPending || Boolean(successMessage)}
            >
              Réinitialiser le mot de passe
            </Button>

            <div className="pt-1 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Retour à la connexion
              </Link>
            </div>

            {!isLinkValid ? (
              <div className="text-center text-sm text-muted-foreground">
                <Link
                  to="/forgot-password"
                  className="font-semibold text-primary hover:underline"
                >
                  Refaire une demande de réinitialisation
                </Link>
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}