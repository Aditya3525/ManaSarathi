import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCurrentUserMock,
  loginUserMock,
  registerUserMock,
  completeOnboardingMock,
  setupUserPasswordMock,
  adminAuthState,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  loginUserMock: vi.fn(),
  registerUserMock: vi.fn(),
  completeOnboardingMock: vi.fn(),
  setupUserPasswordMock: vi.fn(),
  adminAuthState: { admin: null as unknown },
}));

vi.mock('../src/services/auth', () => ({
  getCurrentUser: getCurrentUserMock,
  loginUser: loginUserMock,
  registerUser: registerUserMock,
  signOut: vi.fn(),
  completeOnboarding: completeOnboardingMock,
  setupUserPassword: setupUserPasswordMock,
}));

vi.mock('../src/services/api', () => ({
  assessmentsApi: {
    getActiveAssessmentSession: vi.fn(async () => ({ success: false, data: { session: null } })),
    startAssessmentSession: vi.fn(),
    submitCombinedAssessments: vi.fn(),
    submitAssessment: vi.fn(),
  },
}));

vi.mock('../src/contexts/AdminAuthContext', () => ({
  AdminAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAdminAuth: () => ({ admin: adminAuthState.admin }),
}));

vi.mock('../src/contexts/ChatContext', () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../src/contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../src/hooks/useAssessments', () => ({
  useAssessmentHistory: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(async () => ({ data: null })),
  }),
}));

vi.mock('../src/therapist/useTherapistAuth', () => ({
  useTherapistAuth: () => ({
    session: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../src/admin/AdminDashboard', () => ({
  AdminDashboard: () => <div data-testid="admin-dashboard-page" />,
}));

vi.mock('../src/components/features/assessment', () => ({
  AssessmentList: () => <div data-testid="assessment-list-page" />,
  AssessmentFlow: () => <div data-testid="assessment-flow-page" />,
  CombinedAssessmentFlow: () => <div data-testid="combined-assessment-flow-page" />,
  InsightsResults: () => <div data-testid="insights-results-page" />,
  OverallAssessmentInvite: () => <div data-testid="overall-assessment-invite-page" />,
  OverallAssessmentSelection: () => <div data-testid="overall-assessment-selection-page" />,
  OVERALL_ASSESSMENT_OPTION_IDS: ['anxiety_gad2'],
}));

vi.mock('../src/components/features/auth', () => ({
  AdminLoginPage: () => <div data-testid="admin-login-page" />,
  LandingPage: () => <div data-testid="landing-page" />,
  OAuthCallback: () => <div data-testid="oauth-callback-page" />,
  PasswordSetup: () => <div data-testid="password-setup-page" />,
  UserLoginPage: () => <div data-testid="user-login-page" />,
}));

vi.mock('../src/components/features/chat', () => ({
  ResponsiveChatbot: () => <div data-testid="chatbot-page" />,
}));

vi.mock('../src/components/features/content', () => ({
  ContentLibrary: () => <div data-testid="content-library-page" />,
  Practices: () => <div data-testid="practices-page" />,
}));

vi.mock('../src/components/features/dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-page" />,
}));

vi.mock('../src/components/features/games', () => ({
  GamesHub: () => <div data-testid="games-page" />,
}));

vi.mock('../src/components/features/journal', () => ({
  JournalPage: () => <div data-testid="journal-page" />,
}));

vi.mock('../src/components/features/onboarding', () => ({
  OnboardingFlow: () => <div data-testid="onboarding-page" />,
}));

vi.mock('../src/components/features/plans', () => ({
  PersonalizedPlan: () => <div data-testid="plan-page" />,
}));

vi.mock('../src/components/features/profile', () => ({
  Progress: () => <div data-testid="progress-page" />,
  Profile: () => <div data-testid="profile-page" />,
}));

vi.mock('../src/components/layout', () => ({
  HelpSafety: () => <div data-testid="help-page" />,
}));

vi.mock('../src/components/ui/pwa-install-prompt', () => ({
  PWAInstallPrompt: () => null,
}));

vi.mock('../src/components/ui/ToastContainer', () => ({
  ToastContainer: () => null,
}));

vi.mock('../src/therapist/TherapistDashboard', () => ({
  TherapistDashboard: () => <div data-testid="therapist-dashboard-page" />,
}));

vi.mock('../src/therapist/TherapistLoginPage', () => ({
  TherapistLoginPage: () => <div data-testid="therapist-login-page" />,
}));

import App from '../src/App';
import { useAuthStore } from '../src/stores/authStore';

const resetAuthStore = () => {
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
};

const setPath = (path: string) => {
  window.history.replaceState({}, '', path);
};

describe('App initial routing integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    adminAuthState.admin = null;
    resetAuthStore();
    getCurrentUserMock.mockResolvedValue(null);
    setPath('/');
  });

  it('redirects anonymous users from protected routes to user login', async () => {
    setPath('/dashboard');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/user_login');
    });

    expect(screen.getByTestId('user-login-page')).toBeTruthy();
  });

  it('routes onboarded users away from login routes to dashboard', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Onboarded User',
      email: 'onboarded@example.com',
      hasPassword: true,
      isOnboarded: true,
    });
    setPath('/user_login');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });

    expect(screen.getByTestId('dashboard-page')).toBeTruthy();
  });

  it('forces password setup when user has no password', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-2',
      name: 'Passwordless User',
      email: 'passwordless@example.com',
      hasPassword: false,
      isOnboarded: true,
    });
    setPath('/dashboard');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/password-setup');
    });

    expect(screen.getByTestId('password-setup-page')).toBeTruthy();
  });

  it('forces onboarding when profile is incomplete', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-3',
      name: 'New User',
      email: 'new@example.com',
      hasPassword: true,
      isOnboarded: false,
    });
    setPath('/profile');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/onboarding');
    });

    expect(screen.getByTestId('onboarding-page')).toBeTruthy();
  });

  it('redirects admin route to admin login when no admin session exists', async () => {
    setPath('/admin');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/admin_login');
    });

    expect(screen.getByTestId('admin-login-page')).toBeTruthy();
  });

  it('routes admin login directly to admin dashboard when admin session is active', async () => {
    adminAuthState.admin = { email: 'admin@example.com' };
    setPath('/admin_login');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/admin');
    });

    expect(screen.getByTestId('admin-dashboard-page')).toBeTruthy();
  });

  it('treats legacy OAuth query hints as callback routing signals', async () => {
    setPath('/?token=oauth-token&redirect=%2Fdashboard&needs_setup=true');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/auth/callback');
    });

    expect(screen.getByTestId('oauth-callback-page')).toBeTruthy();
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });

  it('updates route on popstate for authenticated users', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-popstate-auth',
      name: 'Popstate Auth User',
      email: 'popstate-auth@example.com',
      hasPassword: true,
      isOnboarded: true,
    });
    setPath('/dashboard');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });

    await act(async () => {
      window.history.pushState({}, '', '/journal');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe('/journal');
    });

    expect(screen.getByTestId('journal-page')).toBeTruthy();
  });

  it('re-applies auth guard after popstate to protected route for anonymous users', async () => {
    setPath('/user_login');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/user_login');
    });

    await act(async () => {
      window.history.pushState({}, '', '/profile');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe('/user_login');
    });

    expect(screen.getByTestId('user-login-page')).toBeTruthy();
  });
});
