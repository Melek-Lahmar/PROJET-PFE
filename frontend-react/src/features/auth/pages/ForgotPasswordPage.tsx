import { useState, type SVGProps } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

import { forgotPassword } from "../api/authApi";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { AuthSplitShell, BrandMark } from "../components/AuthSplitShell";

function IconMail(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function IconSend(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

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
    <AuthSplitShell screen="forgot">
      <div className="w-full max-w-[440px]">
        <div className="text-center">
          <BrandMark />
          <div className="mt-7 text-[11px] font-black uppercase tracking-[0.24em] text-muted-foreground">
            Récupération d'accès
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] text-card-foreground md:text-[34px]">
            Mot de passe oublié
          </h1>
          <p className="mx-auto mt-4 max-w-[340px] text-[15px] leading-7 text-muted-foreground">
            Saisissez votre email. Si un compte existe, nous préparerons le lien de réinitialisation.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-extrabold text-card-foreground">Email</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground">
                <IconMail className="h-5 w-5" />
              </div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemple.tn"
                autoComplete="email"
                className="h-12 pl-12"
              />
            </div>
          </div>

          {successMessage ? (
            <div className="rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
              {successMessage}
            </div>
          ) : null}

          {mutation.isError ? (
            <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
              {getApiErrorMessage(mutation.error)}
            </div>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            className="h-[52px] w-full rounded-2xl text-base font-black"
            isLoading={mutation.isPending}
            disabled={mutation.isPending}
          >
            <IconSend className="h-5 w-5" />
            Envoyer la demande
          </Button>

          <div className="pt-1 text-center text-sm font-medium text-muted-foreground">
            <Link to="/login" className="font-black text-primary hover:underline">
              Retour à la connexion
            </Link>
          </div>
        </form>
      </div>
    </AuthSplitShell>
  );
}
