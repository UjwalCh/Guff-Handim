import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { toAbsoluteAssetUrl } from '../utils/runtimeConfig';

const fallback = {
  branding: {
    appName: 'Guff Handim',
    tagline: 'Private conversations, modern collaboration.',
    logoUrl: '/icon.svg',
    faviconUrl: '/icon.svg',
    primaryColor: '#059669',
    accentColor: '#0f172a',
  },
  landing: {
    heroTitle: 'Talk securely. Share instantly. Stay in control.',
    heroSubtitle: 'Guff Handim brings encrypted messaging, calls, files, statuses, and admin-grade controls into one polished experience.',
    primaryCtaLabel: 'Login',
    primaryCtaHref: '/login',
    secondaryCtaLabel: 'Sign Up',
    secondaryCtaHref: '/signup',
    tertiaryCtaLabel: 'Forgot Password',
    tertiaryCtaHref: '/forgot-password',
    featureCards: [],
    statCards: [],
    heroImageUrl: '/guff-handim-logo.svg',
    footerText: 'Built for secure communities and modern teams.',
  },
  announcements: [],
};

export function usePublicSiteConfig() {
  return useQuery({
    queryKey: ['public-config'],
    queryFn: async () => {
      const { data } = await api.get('/public/config');
      const branding = {
        ...fallback.branding,
        ...(data?.branding || {}),
      };
      const landing = {
        ...fallback.landing,
        ...(data?.landing || {}),
      };

      branding.logoUrl = toAbsoluteAssetUrl(branding.logoUrl);
      branding.wordmarkUrl = toAbsoluteAssetUrl(branding.wordmarkUrl);
      branding.faviconUrl = toAbsoluteAssetUrl(branding.faviconUrl);
      landing.heroImageUrl = toAbsoluteAssetUrl(landing.heroImageUrl);

      return {
        ...fallback,
        ...data,
        branding,
        landing,
      };
    },
    staleTime: 60_000,
    retry: 1,
    initialData: fallback,
  });
}
