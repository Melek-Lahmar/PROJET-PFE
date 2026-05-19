import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { me } from "../api/authApi";

export function useAuthBootstrap() {
  const token = useAuthStore((s) => s.token);
  const setMe = useAuthStore((s) => s.setMe);
  const clear = useAuthStore((s) => s.clear);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const setBootstrapped = useAuthStore((s) => s.setBootstrapped);

  useEffect(() => {
    if (bootstrapped) return;

    (async () => {
      try {
        if (!token) {
          setBootstrapped(true);
          return;
        }

        const data = await me();
        setMe(data);
        setBootstrapped(true);
      } catch {
        clear();
      }
    })();
  }, [token, bootstrapped, setMe, clear, setBootstrapped]);
}
