import { Outlet, useLocation } from "react-router-dom";
import { PageTransition } from "../components/premium";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

/**
 * Shell global premium plein écran.
 *
 * - Le shell prend 100% du viewport en largeur (plus de `max-w-7xl` qui bridait).
 * - Les gouttières latérales sont fluides (px-5 → px-24 selon breakpoint).
 * - Le fond utilise un dégradé radial + grille subtile pour une ambiance
 *   premium qui reste cohérente d'une page à l'autre.
 * - Les pages auth (login/register/forgot/reset) restent centrées via flex.
 */
export function MainLayout() {
  const location = useLocation();
  const isAuthPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ].some((p) => location.pathname.startsWith(p));

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Gradient ambiant — couvre tout le viewport derrière le contenu. */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at top left, hsl(var(--primary) / 0.18), transparent 55%), radial-gradient(ellipse at top right, hsl(var(--primary) / 0.10), transparent 55%), linear-gradient(180deg, hsl(var(--background)), hsl(var(--background)))",
        }}
      />
      {/* Pattern grille subtile, donne du grain au fond. */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--shell-foreground) / 0.18) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <Navbar />

      <main
        className={`container-app relative z-10 flex-1 py-8 md:py-10 lg:py-12 ${
          isAuthPage ? "flex items-center justify-center" : ""
        }`}
      >
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <Footer />
    </div>
  );
}
