import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAdminStore = create(
  persist(
    (set) => ({
      admin: null,
      token: null,
      otpPendingUsername: null,

      setOtpPending: (username) => set({ otpPendingUsername: username }),
      setAdminAuth: (admin, token) => set({ admin, token, otpPendingUsername: null }),
      clearAdminAuth: () => set({ admin: null, token: null, otpPendingUsername: null }),
    }),
    {
      name: 'gh-admin-auth',
      partialize: (s) => ({ admin: s.admin, token: s.token, otpPendingUsername: s.otpPendingUsername }),
    }
  )
);
