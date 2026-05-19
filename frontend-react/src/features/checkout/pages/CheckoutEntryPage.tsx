import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useCartStore } from "../../cart/store/cartStore";
import { useAuthStore } from "../../auth/store/authStore";
import { Button } from "../../../shared/components/Button";
import {
  EmptyView,
  PremiumHero,
  StaggeredColumn,
} from "../../../shared/components/premium";

const CHECKOUT_RETURN_TO = "/checkout";

export function CheckoutEntryPage() {
  const navigate = useNavigate();

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const shipping = useCartStore((s) => s.shipping());
  const stamp = useCartStore((s) => s.stamp());
  const total = useCartStore((s) => s.total());

  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const isAuth = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    if (!bootstrapped) return;
    if (items.length === 0) return;
    if (isAuth) {
      navigate("/checkout", { replace: true });
    }
  }, [bootstrapped, isAuth, items.length, navigate]);

  if (!bootstrapped) {
    return <div className="card p-6">Chargement...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="w-full space-y-6 py-10">
        <PremiumHero
          kicker="Checkout"
          title="Comment souhaitez-vous finaliser votre commande ?"
          description="Ajoutez des articles avant de commencer votre parcours de commande."
        />
        <EmptyView
          title="Votre panier est vide"
          description="Choisissez d’abord un ou plusieurs articles pour démarrer le checkout."
          iconPath="M3 3h2l.4 2 M7 13h10l4-8H5.4 M7 13 5.4 5 M7 13l-2 7h13"
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/articles">
                <Button type="button" size="lg" className="h-12 rounded-2xl px-7 text-base font-bold">
                  Voir le catalogue
                </Button>
              </Link>
              <Link to="/cart">
                <Button type="button" variant="outline" size="lg" className="h-12 rounded-2xl px-7 text-base">
                  Retour au panier
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 py-10">
      <PremiumHero
        kicker="Checkout"
        title="Comment souhaitez-vous finaliser votre commande ?"
        description="Choisissez le parcours le plus adapté. Vous pouvez vous connecter, créer un compte pour suivre vos commandes, ou continuer comme invité sans casser le contenu actuel de votre panier."
        actions={
          <Link to="/cart">
            <Button type="button" variant="outline" className="h-11 rounded-2xl px-5">
              ← Retour au panier
            </Button>
          </Link>
        }
      />

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <StaggeredColumn className="grid gap-5 lg:col-span-7" step={70}>
          <div className="app-surface p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl">🔐</div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-card-foreground">Se connecter</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Utilisez votre compte existant pour retrouver votre profil, votre adresse enregistrée et suivre la commande
              après validation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex rounded-full bg-muted px-3 py-1 font-semibold">Profil prérempli</span>
              <span className="inline-flex rounded-full bg-muted px-3 py-1 font-semibold">Suivi disponible</span>
            </div>
            <Link to={`/login?returnTo=${encodeURIComponent(CHECKOUT_RETURN_TO)}`} className="mt-7 inline-flex">
              <Button type="button" size="lg" className="h-12 rounded-2xl px-6 text-base font-bold">
                Me connecter
              </Button>
            </Link>
          </div>

          <div className="app-surface p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl">✨</div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-card-foreground">Créer un compte</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Créez votre espace client avant de commander pour conserver un parcours complet, accéder à vos informations et
              centraliser vos futures commandes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex rounded-full bg-muted px-3 py-1 font-semibold">Compte client</span>
              <span className="inline-flex rounded-full bg-muted px-3 py-1 font-semibold">Historique futur</span>
            </div>
            <Link to={`/register?returnTo=${encodeURIComponent(CHECKOUT_RETURN_TO)}`} className="mt-7 inline-flex">
              <Button type="button" variant="outline" size="lg" className="h-12 rounded-2xl px-6 text-base font-bold">
                Créer mon compte
              </Button>
            </Link>
          </div>

          <div className="app-surface border border-primary/15 bg-primary/[0.045] p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">🛍️</div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-card-foreground">Continuer sans se connecter</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Passez votre commande comme invité en remplissant un formulaire complet. Le suivi détaillé restera réservé aux
              comptes connectés, mais votre BC sera bien créé côté système.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex rounded-full bg-white/80 px-3 py-1 font-semibold shadow-sm">Commande invitée</span>
              <span className="inline-flex rounded-full bg-white/80 px-3 py-1 font-semibold shadow-sm">Panier conservé</span>
            </div>
            <Link to="/checkout/guest" className="mt-7 inline-flex">
              <Button type="button" size="lg" className="h-12 rounded-2xl px-6 text-base font-bold">
                Continuer comme invité
              </Button>
            </Link>
          </div>
        </StaggeredColumn>

        <aside className="lg:col-span-5">
          <div className="app-surface sticky top-24 p-8 shadow-[0_30px_90px_-55px_rgba(2,6,23,0.75)]">
            <h2 className="text-xl font-black text-card-foreground">Résumé du panier</h2>
            <p className="mt-1 text-sm text-muted-foreground">Votre sélection actuelle sera conservée quel que soit le parcours choisi.</p>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Articles</span>
                <span className="font-semibold text-card-foreground">{items.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-semibold text-card-foreground">{subtotal.toFixed(3)} TND</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Livraison estimée</span>
                <span className="font-semibold text-card-foreground">{shipping.toFixed(3)} TND</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Timbre fiscal</span>
                <span className="font-semibold text-card-foreground">{stamp.toFixed(3)} TND</span>
              </div>
            </div>

            <div className="my-5 border-t border-dashed border-border" />

            <div className="flex items-end justify-between gap-3">
              <span className="text-lg font-black text-card-foreground">Total TTC</span>
              <div className="text-right text-3xl font-black tracking-tight text-primary">
                {total.toFixed(3)} <span className="text-sm font-semibold text-muted-foreground">TND</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}