const { Announcement, SystemSetting } = require('../models');

const DEFAULT_BRANDING = {
  appName: 'Guff Handim',
  tagline: 'Private conversations, modern collaboration.',
  logoUrl: '/icon.svg',
  wordmarkUrl: null,
  faviconUrl: '/icon.svg',
  primaryColor: '#059669',
  accentColor: '#0f172a',
};

const DEFAULT_LANDING = {
  heroTitle: 'Talk securely. Share instantly. Stay in control.',
  heroSubtitle: 'Guff Handim brings encrypted messaging, calls, files, statuses, and admin-grade controls into one polished experience.',
  primaryCtaLabel: 'Login',
  primaryCtaHref: '/login',
  secondaryCtaLabel: 'Sign Up',
  secondaryCtaHref: '/signup',
  tertiaryCtaLabel: 'Forgot Password',
  tertiaryCtaHref: '/forgot-password',
  featureCards: [
    { title: 'Encrypted Messaging', description: 'End-to-end protected chats for direct and group conversations.' },
    { title: 'Media & Files', description: 'Share photos, videos, audio, and documents with moderation support.' },
    { title: 'Calls & Presence', description: 'Voice, video, typing indicators, read receipts, and live presence.' },
  ],
  statCards: [
    { label: 'Realtime', value: '24/7' },
    { label: 'Privacy', value: 'E2EE' },
    { label: 'Admin Control', value: 'Full' },
  ],
  heroImageUrl: '/guff-handim-logo.svg',
  footerText: 'Built for secure communities and modern teams.',
};

async function getPublicConfig(_req, res, next) {
  try {
    const brandingSetting = await SystemSetting.findByPk('site_branding');
    const landingSetting = await SystemSetting.findByPk('site_landing');
    const activeAnnouncements = await Announcement.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    res.json({
      branding: { ...DEFAULT_BRANDING, ...(brandingSetting?.value || {}) },
      landing: { ...DEFAULT_LANDING, ...(landingSetting?.value || {}) },
      announcements: activeAnnouncements,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPublicConfig };
