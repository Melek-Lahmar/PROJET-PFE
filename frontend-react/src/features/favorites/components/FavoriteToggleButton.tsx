import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";
import { Button } from "../../../shared/components/Button";
import { useToast } from "../../../shared/components/premium/Toast";
import { useAuthStore } from "../../auth/store/authStore";
import { isFavorite, toggleFavorite } from "../api/favoritesApi";

type Props = {
  arRef: string;
  designation?: string;
  mode?: "card" | "details";
  className?: string;
};

function IconHeart({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    </svg>
  );
}

function isInternalRole(roles: string[]) {
  const normalized = roles.map((role) => role.toUpperCase());
  return normalized.some((role) =>
    ["ADMIN", "VENDEUR", "CONFIRMATEUR", "LIVREUR", "SUPERVISEUR"].includes(role)
  );
}

function isClient(roles: string[]) {
  const normalized = roles.map((role) => role.toUpperCase());
  return normalized.includes("CLIENT") && !isInternalRole(normalized);
}

export function FavoriteToggleButton({ arRef, designation, mode = "card", className = "" }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const token = useAuthStore((s) => s.token);
  const roles = useAuthStore((s) => (Array.isArray(s.roles) ? s.roles : []));
  const isAuthenticated = Boolean(token);
  const canUseFavorites = isClient(roles);
  const normalizedArRef = arRef.trim();

  const existsQuery = useQuery({
    queryKey: ["favorite-exists", normalizedArRef],
    queryFn: () => isFavorite(normalizedArRef),
    enabled: isAuthenticated && canUseFavorites && Boolean(normalizedArRef),
    staleTime: 30_000,
    retry: 1,
  });

  const selected = existsQuery.data?.isFavorite ?? false;

  const mutation = useMutation({
    mutationFn: () => toggleFavorite(normalizedArRef),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["favorite-exists", normalizedArRef] });

      const previous = queryClient.getQueryData<{ arRef: string; isFavorite: boolean }>([
        "favorite-exists",
        normalizedArRef,
      ]);

      queryClient.setQueryData(["favorite-exists", normalizedArRef], {
        arRef: normalizedArRef,
        isFavorite: !selected,
      });

      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["favorite-exists", normalizedArRef], {
        arRef: data.arRef,
        isFavorite: data.isFavorite,
      });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorites-count"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-exists", normalizedArRef] });

      toast.success(data.isFavorite ? "Ajouté aux favoris" : "Retiré des favoris", designation);
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["favorite-exists", normalizedArRef], context.previous);
      }
      toast.error("Favoris indisponibles", getApiErrorMessage(error));
    },
  });

  if (isAuthenticated && !canUseFavorites) {
    return null;
  }

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      toast.info("Connexion requise", "Connectez-vous pour ajouter cet article aux favoris.");
      const returnTo = `${location.pathname}${location.search}${location.hash}`;
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }

    if (!normalizedArRef) {
      toast.error("Favoris indisponibles", "Référence article manquante.");
      return;
    }

    mutation.mutate();
  };

  const label = selected
    ? `Retirer ${designation || "cet article"} des favoris`
    : `Ajouter ${designation || "cet article"} aux favoris`;

  if (mode === "details") {
    return (
      <Button
        type="button"
        variant={selected ? "primary" : "outline"}
        onClick={onClick}
        isLoading={mutation.isPending || existsQuery.isFetching}
        aria-label={label}
        className={`h-12 w-full rounded-2xl text-base font-semibold ${
          selected ? "bg-rose-600 hover:brightness-110" : ""
        } ${className}`}
      >
        <IconHeart filled={selected} className="h-5 w-5" />
        <span>{selected ? "Retirer des favoris" : "Ajouter aux favoris"}</span>
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={mutation.isPending || !normalizedArRef}
      aria-label={label}
      title={selected ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`catalog-product-favorite-btn-v2 ${selected ? "is-favorite" : ""} ${className}`}
    >
      <IconHeart filled={selected} className="h-6 w-6" />
    </button>
  );
}
