import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MeResponseDto, ProfilUtilisateur } from "../types/auth";

type AuthState = {
  token: string | null;
  expiresInMinutes: number | null;

  userId: string | null;
  email: string | null;
  roles: string[];

  profile: ProfilUtilisateur | null;

  bootstrapped: boolean;

  setAuth: (args: {
    token: string;
    expiresInMinutes: number;
    userId: string;
    email: string;
    roles: string[];
  }) => void;

  clear: () => void;

  setMe: (me: MeResponseDto) => void;

  setBootstrapped: (v: boolean) => void;

  isAuthenticated: () => boolean;
  hasRole: (role: string) => boolean;
  getToken: () => string | null;
};

function normalizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((x) => String(x)).filter(Boolean);
}

function migrateAuthState(persistedState: unknown) {
  if (!persistedState || typeof persistedState !== "object") {
    return persistedState as Partial<AuthState>;
  }

  const state = persistedState as Partial<AuthState>;

  return {
    ...state,
    token: state.token ?? null,
    expiresInMinutes: typeof state.expiresInMinutes === "number" ? state.expiresInMinutes : null,
    userId: state.userId ?? null,
    email: state.email ?? null,
    roles: normalizeRoles(state.roles),
    profile: state.profile ?? null,
    bootstrapped: Boolean(state.bootstrapped),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      expiresInMinutes: null,
      userId: null,
      email: null,
      roles: [],
      profile: null,
      bootstrapped: false,

      setAuth: ({ token, expiresInMinutes, userId, email, roles }) =>
        set({
          token: token ?? null,
          expiresInMinutes: Number.isFinite(expiresInMinutes) ? expiresInMinutes : 60,
          userId: userId ?? null,
          email: email ?? null,
          roles: normalizeRoles(roles),
          profile: null,
          bootstrapped: false,
        }),

      clear: () =>
        set({
          token: null,
          expiresInMinutes: null,
          userId: null,
          email: null,
          roles: [],
          profile: null,
          bootstrapped: true,
        }),

      setMe: (me) =>
        set({
          userId: me.userId,
          email: me.email,
          roles: normalizeRoles(me.roles),
          profile: me.profile ?? null,
        }),

      setBootstrapped: (v) => set({ bootstrapped: v }),

      isAuthenticated: () => !!get().token,
      hasRole: (role) => normalizeRoles(get().roles).includes(role),
      getToken: () => get().token,
    }),
    {
      name: "melek-auth",
      version: 2,
      migrate: (persistedState) => migrateAuthState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(migrateAuthState(persistedState) ?? {}),
      }),
    }
  )
);
