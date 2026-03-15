import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearKeys } from '../utils/encryption';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),

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
    }
  )
);
