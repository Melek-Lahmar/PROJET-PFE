import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../../features/admin/api/settingsApi";

export type PublicSettings = Record<string, unknown>;

export function usePublicSettings() {
  const { data = {} } = useQuery<PublicSettings>({
    queryKey: ["public-settings"],
    queryFn: getPublicSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  function get<T>(key: string, fallback: T): T {
    const val = data[key];
    if (val === undefined || val === null) return fallback;
    return val as T;
  }

  return { settings: data, get };
}
