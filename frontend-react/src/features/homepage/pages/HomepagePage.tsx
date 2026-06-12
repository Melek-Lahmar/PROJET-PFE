import { useQuery } from '@tanstack/react-query';
import { Loader } from '../../../shared/components/Loader';
import { getHomepage } from '../api/homepageApi';
import { HomepageRenderer } from '../components/HomepageRenderer';
import { getDepots } from '../../catalog/api/depotsApi';
import {
  EmptyView,
  PremiumHero,
} from '../../../shared/components/premium';

export function HomepagePage() {
  const query = useQuery({
    queryKey: ['homepage', 'public'],
    queryFn: getHomepage,
  });

  const depotsQuery = useQuery({
    queryKey: ['homepage', 'public', 'depots'],
    queryFn: () => getDepots(false),
    staleTime: 5 * 60 * 1000,
  });

  if (query.isLoading) return <Loader />;

  if (query.isError || !query.data) {
    return (
      <div className="w-full space-y-6 py-10">
        <PremiumHero kicker="Page d’accueil" title="Bienvenue" />
        <EmptyView
          title="Erreur de chargement"
          description="Impossible de charger la page d’accueil publique. Réessayez ou rafraîchissez la page."
          iconPath="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </div>
    );
  }

  return <HomepageRenderer view={query.data} depotCount={depotsQuery.data?.length ?? 0} />;
}
