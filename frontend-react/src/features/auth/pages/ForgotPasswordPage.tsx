import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { forgotPassword } from "../api/authApi";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => forgotPassword({ email }),
    onSuccess: (res) => {
      setSuccessMessage(
        res?.message ??
          "Si un compte existe pour cet email, la procédure de réinitialisation a été déclenchée."
      );
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSuccessMessage(null);
    mutation.mutate();
  };

  return (
    <div className="mx-auto w-full max-w-md py-10">
      <div className="app-surface anim-fade-up overflow-hidden text-card-foreground shadow-[0_38px_110px_-55px_rgba(15,23,42,0.9)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-indigo-500 to-fuchsia-500" />

        <div className="space-y-6 px-8 py-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-xl font-black text-white shadow-[0_18px_38px_-24px_hsl(var(--primary)/0.8)]">
              E
            </div>
            <div className="app-kicker">Récupération d'accès</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-card-foreground">
              Mot de passe oublié
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Saisissez votre email. Si un compte existe, nous préparerons le lien de
              réinitialisation.
            </p>
          </div>

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

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            {mutation.isError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {getApiErrorMessage(mutation.error)}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="h-12 w-full rounded-2xl text-base font-bold"
              isLoading={mutation.isPending}
              disabled={mutation.isPending}
            >
              Envoyer la demande
            </Button>

            <div className="pt-1 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Retour à la connexion
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}