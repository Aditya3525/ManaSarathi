import type { StoredUser } from '../services/auth';

export type Page =
  | 'landing'
  | 'user-login'
  | 'admin-login'
  | 'onboarding'
  | 'password-setup'
  | 'dashboard'
  | 'assessments'
  | 'assessment-flow'
  | 'combined-assessment-flow'
  | 'assessment-invite'
  | 'assessment-selection'
  | 'insights'
  | 'plan'
  | 'chatbot'
  | 'library'
  | 'practices'
  | 'journal'
  | 'games'
  | 'progress'
  | 'profile'
  | 'help'
  | 'oauth-callback'
  | 'admin'
  | 'therapist-login'
  | 'therapist-portal';

export type RoutingUser = Pick<StoredUser, 'hasPassword' | 'isOnboarded'>;

export const normalizePath = (path: string): string => {
  if (!path) return '/';
  if (path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
};

export const PAGE_ROUTES: Record<Page, string> = {
  landing: '/',
  'user-login': '/user_login',
  'admin-login': '/admin_login',
  onboarding: '/onboarding',
  'password-setup': '/password-setup',
  dashboard: '/dashboard',
  assessments: '/assessments',
  'assessment-flow': '/assessments/active',
  'combined-assessment-flow': '/assessments/combined',
  'assessment-invite': '/assessments/invite',
  'assessment-selection': '/assessments/selection',
  insights: '/insights',
  plan: '/plan',
  chatbot: '/chatbot',
  library: '/library',
  practices: '/practices',
  journal: '/journal',
  games: '/games',
  progress: '/progress',
  profile: '/profile',
  help: '/help',
  'oauth-callback': '/auth/callback',
  admin: '/admin',
  'therapist-login': '/therapist_login',
  'therapist-portal': '/therapist_portal'
};

const PATH_TO_PAGE: Record<string, Page> = Object.entries(PAGE_ROUTES).reduce((acc, [page, route]) => {
  acc[route] = page as Page;
  return acc;
}, {} as Record<string, Page>);

export const PUBLIC_PAGES = new Set<Page>([
  'landing',
  'user-login',
  'admin-login',
  'therapist-login',
  'oauth-callback'
]);

export const THERAPIST_PAGES = new Set<Page>(['therapist-login', 'therapist-portal']);

export const PRE_ONBOARDING_ALLOWED_PAGES = new Set<Page>([
  'landing',
  'onboarding',
  'assessment-invite',
  'assessment-selection',
  'combined-assessment-flow',
  'assessment-flow',
  'insights',
  'password-setup'
]);

export const pathToPage = (rawPath: string): Page => {
  const normalized = normalizePath(rawPath);

  if (normalized === '/therapist-login') {
    return 'therapist-login';
  }

  if (normalized === '/therapist-portal') {
    return 'therapist-portal';
  }

  return PATH_TO_PAGE[normalized] ?? 'landing';
};

export const resolveInitialPage = (
  user: RoutingUser | null,
  requestedPage: Page,
  adminAuthenticated: boolean
): Page => {
  if (requestedPage === 'admin') {
    return adminAuthenticated ? 'admin' : 'admin-login';
  }

  if (requestedPage === 'admin-login' && adminAuthenticated) {
    return 'admin';
  }

  if (requestedPage === 'therapist-login' || requestedPage === 'therapist-portal') {
    return requestedPage;
  }

  if (!user) {
    return PUBLIC_PAGES.has(requestedPage) ? requestedPage : 'user-login';
  }

  if (user.hasPassword === false && requestedPage !== 'password-setup' && requestedPage !== 'oauth-callback') {
    return 'password-setup';
  }

  if (!user.isOnboarded && !PRE_ONBOARDING_ALLOWED_PAGES.has(requestedPage)) {
    return 'onboarding';
  }

  if (requestedPage === 'landing' || requestedPage === 'user-login' || requestedPage === 'admin-login') {
    return user.isOnboarded ? 'dashboard' : 'onboarding';
  }

  if (requestedPage === 'oauth-callback') {
    return user.isOnboarded ? 'dashboard' : 'onboarding';
  }

  return requestedPage;
};
