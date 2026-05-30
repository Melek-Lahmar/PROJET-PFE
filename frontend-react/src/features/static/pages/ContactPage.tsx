import { PremiumHero, StaggeredColumn } from "../../../shared/components/premium";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { useState } from "react";

function ContactCard({
  icon,
  title,
  value,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="hover-lift flex items-start gap-4 rounded-[24px] border border-border/70 bg-card p-6 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="app-kicker mb-1">{title}</div>
        <div className="text-base font-extrabold text-card-foreground">{value}</div>
        {sub ? <div className="mt-1 text-sm text-muted-foreground">{sub}</div> : null}
      </div>
    </div>
  );
}

function IconMail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4h16v16H4z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconPhone(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2Z" />
    </svg>
  );
}

function IconPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s7-4.5 7-12a7 7 0 0 0-14 0c0 7.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

function IconClock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="w-full space-y-10 pb-10">
      <PremiumHero
        kicker="Support"
        title="Contactez-nous"
        description="Notre équipe est disponible pour répondre à toutes vos questions concernant votre compte, vos commandes ou la livraison."
      />

      <StaggeredColumn className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" step={55}>
        <ContactCard
          icon={<IconMail className="h-6 w-6" />}
          title="Email"
          value="support@ecommerce.tn"
          sub="Réponse sous 24h"
        />
        <ContactCard
          icon={<IconPhone className="h-6 w-6" />}
          title="Téléphone"
          value="+216 00 000 000"
          sub="Appel direct"
        />
        <ContactCard
          icon={<IconPin className="h-6 w-6" />}
          title="Adresse"
          value="Sfax, Tunisie"
          sub="Siège social"
        />
        <ContactCard
          icon={<IconClock className="h-6 w-6" />}
          title="Horaires"
          value="Lun–Ven 09h–17h"
          sub="Sam 09h–13h"
        />
      </StaggeredColumn>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="app-surface p-8">
          <div className="app-kicker mb-2">Formulaire</div>
          <h2 className="text-xl font-extrabold text-card-foreground mb-6">Envoyer un message</h2>

          {sent ? (
            <div className="rounded-[20px] border border-success/25 bg-success/10 p-6 text-center">
              <div className="text-2xl mb-2">✓</div>
              <div className="font-extrabold text-success">Message envoyé !</div>
              <p className="mt-2 text-sm text-muted-foreground">Nous vous répondrons dans les plus brefs délais.</p>
              <Button type="button" variant="outline" className="mt-4" onClick={() => setSent(false)}>
                Nouveau message
              </Button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase text-muted-foreground">Nom complet</label>
                  <Input placeholder="Votre nom" required />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase text-muted-foreground">Email</label>
                  <Input type="email" placeholder="email@exemple.tn" required />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-muted-foreground">Sujet</label>
                <Input placeholder="Objet de votre demande" required />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-muted-foreground">Message</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Décrivez votre demande..."
                  className="w-full rounded-2xl border border-border/80 bg-input px-4 py-3 text-sm text-card-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Envoyer le message
              </Button>
            </form>
          )}
        </div>

        <div className="space-y-6">
          <div className="app-surface p-6">
            <h3 className="font-extrabold text-card-foreground mb-4">Questions fréquentes</h3>
            <div className="space-y-4">
              {[
                { q: "Comment suivre ma commande ?", a: "Connectez-vous et accédez à « Mes commandes » pour suivre l'état en temps réel." },
                { q: "Comment modifier mon profil ?", a: "Rendez-vous sur « Mon compte » pour mettre à jour vos informations personnelles." },
                { q: "Quel est le délai de livraison ?", a: "La livraison à domicile est généralement effectuée sous 24 à 72 heures ouvrables." },
              ].map(({ q, a }) => (
                <div key={q} className="rounded-[18px] border border-border/60 bg-muted/20 p-4">
                  <div className="text-sm font-extrabold text-card-foreground">{q}</div>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-primary/20 bg-primary/[0.06] p-6">
            <div className="font-extrabold text-card-foreground mb-2">Assistance urgente ?</div>
            <p className="text-sm text-muted-foreground mb-4">
              Pour les problèmes urgents (commande bloquée, paiement non confirmé), contactez-nous directement par téléphone.
            </p>
            <Button type="button" variant="outline" className="gap-2">
              <IconPhone className="h-4 w-4" />
              Appeler maintenant
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
