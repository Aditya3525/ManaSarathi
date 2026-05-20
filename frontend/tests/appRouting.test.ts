import { describe, expect, it } from 'vitest';
import {
  normalizePath,
  pathToPage,
  resolveInitialPage,
  type Page,
  type RoutingUser,
} from '../src/utils/appRouting';

describe('app routing helpers', () => {
  describe('normalizePath', () => {
    it('normalizes empty and root paths', () => {
      expect(normalizePath('')).toBe('/');
      expect(normalizePath('/')).toBe('/');
    });

    it('removes trailing slashes from non-root paths', () => {
      expect(normalizePath('/dashboard/')).toBe('/dashboard');
      expect(normalizePath('/assessments///')).toBe('/assessments');
    });
  });

  describe('pathToPage', () => {
    it('maps known routes and therapist aliases', () => {
      expect(pathToPage('/dashboard')).toBe('dashboard');
      expect(pathToPage('/therapist-login')).toBe('therapist-login');
      expect(pathToPage('/therapist-portal')).toBe('therapist-portal');
    });

    it('maps known routes even with trailing slashes', () => {
      expect(pathToPage('/dashboard/')).toBe('dashboard');
      expect(pathToPage('/therapist-login/')).toBe('therapist-login');
      expect(pathToPage('/therapist-portal/')).toBe('therapist-portal');
    });

    it('falls back to landing for unknown routes', () => {
      expect(pathToPage('/non-existent-page')).toBe('landing');
    });
  });

  describe('resolveInitialPage', () => {
    const onboardedUser: RoutingUser = { hasPassword: true, isOnboarded: true };
    const unOnboardedUser: RoutingUser = { hasPassword: true, isOnboarded: false };

    it('redirects anonymous users away from protected pages', () => {
      const page = resolveInitialPage(null, 'dashboard', false);
      expect(page).toBe('user-login');
    });

    it('keeps anonymous users on public pages', () => {
      const publicPages: Page[] = ['landing', 'user-login', 'admin-login', 'oauth-callback'];
      publicPages.forEach((requestedPage) => {
        expect(resolveInitialPage(null, requestedPage, false)).toBe(requestedPage);
      });
    });

    it('handles admin page authentication rules', () => {
      expect(resolveInitialPage(null, 'admin', false)).toBe('admin-login');
      expect(resolveInitialPage(null, 'admin', true)).toBe('admin');
      expect(resolveInitialPage(null, 'admin-login', true)).toBe('admin');
    });

    it('forces password setup before other pages', () => {
      const userWithoutPassword: RoutingUser = { hasPassword: false, isOnboarded: true };
      expect(resolveInitialPage(userWithoutPassword, 'dashboard', false)).toBe('password-setup');
    });

    it('routes oauth callback to onboarding when onboarding is still incomplete', () => {
      const userWithoutPassword: RoutingUser = { hasPassword: false, isOnboarded: false };
      expect(resolveInitialPage(userWithoutPassword, 'oauth-callback', false)).toBe('onboarding');
    });

    it('keeps non-onboarded users on onboarding-safe pages only', () => {
      expect(resolveInitialPage(unOnboardedUser, 'dashboard', false)).toBe('onboarding');
      expect(resolveInitialPage(unOnboardedUser, 'assessment-selection', false)).toBe('assessment-selection');
      expect(resolveInitialPage(unOnboardedUser, 'assessment-flow', false)).toBe('assessment-flow');
      expect(resolveInitialPage(unOnboardedUser, 'password-setup', false)).toBe('password-setup');
    });

    it('sends onboarded users away from login/landing pages', () => {
      const pages: Page[] = ['landing', 'user-login', 'admin-login', 'oauth-callback'];
      pages.forEach((requestedPage) => {
        expect(resolveInitialPage(onboardedUser, requestedPage, false)).toBe('dashboard');
      });
    });

    it('preserves therapist route targets regardless of user auth state', () => {
      expect(resolveInitialPage(null, 'therapist-login', false)).toBe('therapist-login');
      expect(resolveInitialPage(null, 'therapist-portal', false)).toBe('therapist-portal');
      expect(resolveInitialPage(onboardedUser, 'therapist-login', false)).toBe('therapist-login');
      expect(resolveInitialPage(onboardedUser, 'therapist-portal', false)).toBe('therapist-portal');
    });
  });
});
