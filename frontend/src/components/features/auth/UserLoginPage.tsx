import { ArrowLeft, CheckCircle, Eye, EyeOff, Shield, Sparkles, UserRound } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { getServerBaseUrl } from '../../../config/apiConfig';

import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Separator } from '../../ui/separator';

import { ForgotPasswordDialog } from './ForgotPasswordDialog';

interface UserLoginPageProps {
  onLogin: (credentials: { email: string; password: string }) => Promise<void> | void;
  onSignUp: (userData: { name: string; email: string; password: string }) => Promise<void> | void;
  authError?: string | null;
  loginError?: { message?: string; error?: string; suggestion?: string } | null;
  onNavigateHome: () => void;
  onNavigateAdmin: () => void;
  startOAuth?: () => void;
}

export const UserLoginPage: React.FC<UserLoginPageProps> = ({
  onLogin,
  onSignUp,
  authError,
  loginError,
  onNavigateHome,
  onNavigateAdmin,
  startOAuth
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [activeView, setActiveView] = useState<'login' | 'signup'>('login');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const signupPasswordStrength = useMemo(() => {
    if (!signupPassword) {
      return { score: 0, label: '', colorClass: '', progressClass: 'bg-border' };
    }

    const checks = [
      signupPassword.length >= 8,
      /[a-z]/.test(signupPassword),
      /[A-Z]/.test(signupPassword),
      /\d/.test(signupPassword),
      /[^A-Za-z0-9]/.test(signupPassword)
    ];
    const passedChecks = checks.filter(Boolean).length;
    const score = Math.round((passedChecks / checks.length) * 100);

    if (score < 40) {
      return { score, label: 'Weak', colorClass: 'text-red-600', progressClass: 'bg-red-500' };
    }
    if (score < 70) {
      return { score, label: 'Fair', colorClass: 'text-amber-600', progressClass: 'bg-amber-500' };
    }
    if (score < 90) {
      return { score, label: 'Good', colorClass: 'text-blue-600', progressClass: 'bg-blue-500' };
    }

    return { score, label: 'Strong', colorClass: 'text-emerald-600', progressClass: 'bg-emerald-500' };
  }, [signupPassword]);

  useEffect(() => {
    const handleDuplicateSignup = (event: Event) => {
      const customEvent = event as CustomEvent<{ email?: string }>;
      const duplicateEmail = customEvent.detail?.email || '';

      if (duplicateEmail) {
        setEmail(duplicateEmail);
        setSignupEmail(duplicateEmail);
      }

      setActiveView('login');
    };

    const handleMissingAccount = (event: Event) => {
      const customEvent = event as CustomEvent<{ email?: string }>;
      const missingEmail = customEvent.detail?.email || '';

      if (missingEmail) {
        setSignupEmail(missingEmail);
      }

      setActiveView('signup');
    };

    window.addEventListener('show-login-from-duplicate', handleDuplicateSignup as EventListener);
    window.addEventListener('show-signup-from-missing-account', handleMissingAccount as EventListener);

    return () => {
      window.removeEventListener('show-login-from-duplicate', handleDuplicateSignup as EventListener);
      window.removeEventListener('show-signup-from-missing-account', handleMissingAccount as EventListener);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      await Promise.resolve(onLogin({ email, password }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fullName || !signupEmail || !signupPassword) {
      return;
    }

    setIsCreatingAccount(true);
    try {
      await Promise.resolve(onSignUp({ name: fullName, email: signupEmail, password: signupPassword }));
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleGoogleAuth = () => {
    if (startOAuth) {
      startOAuth();
      return;
    }
    window.location.assign(`${getServerBaseUrl()}/api/auth/google`);
  };

  const combinedError = authError || loginError?.message || loginError?.error;
  const isSignupView = activeView === 'signup';

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.2fr,1fr]">
      <section className="hidden bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 p-10 text-primary-foreground lg:block">
        <div className="flex h-full w-full flex-col justify-between">
          <div className="space-y-8 text-primary-foreground/90">
            <Button
              variant="ghost"
              className="w-fit text-primary-foreground/80 hover:text-primary-foreground"
              onClick={onNavigateHome}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to wellbeing.ai
            </Button>

            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/30 px-3 py-1 text-sm font-medium uppercase tracking-wide">
                <Sparkles className="h-4 w-4" />
                Members-first privacy
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-primary-foreground">
                Welcome back.
                <span className="block text-primary-foreground/90">Let&apos;s continue your calm journey.</span>
              </h1>
              <p className="max-w-md text-base text-primary-foreground/80">
                Log in to access your personalized assessments, practices, and progress insights. We keep your private data encrypted and under your control at every step.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl bg-primary-foreground/10 p-6 text-primary-foreground">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5" />
                <p className="text-sm font-medium uppercase tracking-wide">You&apos;re in safe hands</p>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  HIPAA-ready infrastructure and zero-trust authentication
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Fine-grained sharing controls with therapists or loved ones
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Automatic sync across web and mobile anytime you need calm
                </li>
              </ul>
            </div>
          </div>

          <div className="text-sm text-primary-foreground/70">
            Need admin access?{' '}
            <button type="button" className="underline" onClick={onNavigateAdmin}>
              Switch to admin login
            </button>
          </div>
        </div>
      </section>

      <main className="flex items-center justify-center bg-background px-6 py-16 lg:px-10">
        <div className="w-full max-w-[380px] space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isSignupView ? 'Create account' : 'Member login'}
            </p>
            <h2 className="text-2xl font-semibold text-foreground">
              {isSignupView ? 'Start your calm journey' : 'Welcome back'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignupView
                ? 'Share a few details and we’ll guide you into onboarding to tailor assessments and daily practices.'
                : 'Sign in with your registered email address to pick up where you left off.'}
            </p>
          </div>

          {isSignupView ? (
            <Card className="shadow-lg ring-1 ring-primary/10">
              <CardHeader className="space-y-2 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Create a new account
                </CardTitle>
                <CardDescription>Unlock personalized insights, practices, and mindful nudges.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-6 pb-6">
                {authError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                    {authError}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSignUp} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full name</Label>
                    <Input
                      id="signup-name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Enter your name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(event) => setSignupEmail(event.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(event) => setSignupPassword(event.target.value)}
                        placeholder="Create a password"
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-muted-foreground"
                        onClick={() => setShowSignupPassword((prev) => !prev)}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupPassword.length > 0 && (
                      <div className="space-y-2 rounded-md border border-border/70 bg-muted/30 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Password strength</span>
                          <span className={signupPasswordStrength.colorClass}>{signupPasswordStrength.label}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border">
                          <div
                            className={`h-1.5 rounded-full transition-all ${signupPasswordStrength.progressClass}`}
                            style={{ width: `${signupPasswordStrength.score}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Strong suggestion: use at least 8 characters with uppercase, lowercase, number, and a symbol.
                        </p>
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isCreatingAccount || !fullName || !signupEmail || !signupPassword}>
                    {isCreatingAccount ? 'Creating account…' : 'Create account'}
                  </Button>
                </form>

                <Separator className="bg-border" />

                <Button variant="outline" className="flex w-full items-center justify-center gap-2" onClick={handleGoogleAuth}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>

                <div className="space-y-2 text-center text-xs text-muted-foreground">
                  <p>
                    Already have an account?{' '}
                    <button type="button" className="underline" onClick={() => setActiveView('login')}>
                      Use the login form
                    </button>
                  </p>
                  <p>By creating an account you agree to our privacy-first data practices.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg">
              <CardHeader className="space-y-2 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserRound className="h-5 w-5 text-primary" />
                  Member account
                </CardTitle>
                <CardDescription>Access your personalized insights and mindful practices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-6 pb-6">
                {combinedError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                    {combinedError}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="user-email">Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="user-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-muted-foreground"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting || !email || !password}>
                    {isSubmitting ? 'Signing in…' : 'Sign in'}
                  </Button>
                  <div className="mt-2 text-right text-sm">
                    <button
                      type="button"
                      className="text-primary underline-offset-4 transition hover:underline"
                      onClick={() => setIsForgotPasswordOpen(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                </form>

                <Separator className="bg-border" />

                <Button variant="outline" className="flex w-full items-center justify-center gap-2" onClick={handleGoogleAuth}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>

                <div className="space-y-3 text-center text-sm text-muted-foreground">
                  {loginError?.suggestion === 'create_account' && (
                    <p>
                      No account found.{' '}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          setSignupEmail(email);
                          setActiveView('signup');
                        }}
                      >
                        Create account instead
                      </button>
                    </p>
                  )}
                  {loginError?.suggestion === 'use_google_or_setup_password' && (
                    <p>
                      Password login unavailable.{' '}
                      <button type="button" className="underline" onClick={handleGoogleAuth}>
                        Continue with Google
                      </button>
                    </p>
                  )}
                  <p>
                    New to Wellbeing AI?{' '}
                    <button type="button" className="underline" onClick={() => setActiveView('signup')}>
                      Create an account
                    </button>
                  </p>
                  <p>
                    Need admin tools?{' '}
                    <button type="button" className="underline" onClick={onNavigateAdmin}>
                      Log in as admin
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <ForgotPasswordDialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen} />
    </div>
  );
};
