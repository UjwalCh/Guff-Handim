import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearKeys } from '../utils/encryption';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      hasHydrated: false,

      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      setAccessToken: (accessToken) => set((state) => ({
        accessToken,
        isAuthenticated: !!state.user && !!accessToken,
      })),
      setUser: (user) => set((state) => ({
        user,
        isAuthenticated: !!user && !!state.accessToken,
      })),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      logout: () => {
        clearKeys();
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'sc-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        isAuthenticated: !!s.user && !!s.accessToken && s.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
