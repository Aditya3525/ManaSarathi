import { ArrowLeft, CheckCircle, KeyRound, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Separator } from '../../ui/separator';

import { DEMO_LOGIN_EMAIL, DEMO_LOGIN_PASSWORD } from './defaultCredentials';

interface AdminLoginPageProps {
  onAdminLogin: (credentials: { email: string; password: string }) => Promise<void> | void;
  authError?: string | null;
  loginError?: { message?: string; error?: string } | null;
  onNavigateHome: () => void;
  onNavigateUserLogin: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onAdminLogin,
  authError,
  loginError,
  onNavigateHome,
  onNavigateUserLogin
}) => {
  const [email, setEmail] = useState(DEMO_LOGIN_EMAIL);
  const [password, setPassword] = useState(DEMO_LOGIN_PASSWORD);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      await Promise.resolve(onAdminLogin({ email, password }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const combinedError = authError || loginError?.message || loginError?.error;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr,1fr]">
      <section className="hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-10 text-slate-100 lg:block">
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-8">
            <Button
              variant="ghost"
              className="w-fit text-slate-200 hover:text-white"
              onClick={onNavigateHome}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to wellbeing.ai
            </Button>

            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium uppercase tracking-wide text-white/90">
                <ShieldCheck className="h-4 w-4" />
                Secure admin console
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-white">
                Control center for wellbeing operations
              </h1>
              <p className="max-w-lg text-base text-white/80">
                Monitor platform health, approve content, and support members with the tools you need to keep our wellbeing community thriving.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl bg-white/10 p-6 text-sm text-white/90">
              <div className="flex items-center gap-3 font-semibold">
                <CheckCircle className="h-4 w-4" />
                Security best practices
              </div>
              <ul className="space-y-3">
                <li>Mandatory strong passwords and audit logging</li>
                <li>Role-based access with least privilege defaults</li>
                <li>Session timeouts and device fingerprinting</li>
              </ul>
            </div>
          </div>

          <div className="text-sm text-white/70">
            Looking for your personal account?{' '}
            <button type="button" className="underline" onClick={onNavigateUserLogin}>
              Switch to member login
            </button>
          </div>
        </div>
      </section>

      <main className="flex items-center justify-center bg-background px-6 py-16 lg:px-10">
        <div className="w-full max-w-[340px] space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin login</p>
            <h2 className="text-2xl font-semibold text-foreground">Authenticate to continue</h2>
            <p className="text-sm text-muted-foreground">Only authorized team members should proceed. All actions are logged.</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="space-y-2 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <KeyRound className="h-5 w-5 text-primary" />
                Admin console access
              </CardTitle>
              <CardDescription>Enter your administrator credentials to open the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-6 pb-6">
              {combinedError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                  {combinedError}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Work email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={DEMO_LOGIN_EMAIL}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={DEMO_LOGIN_PASSWORD}
                    required
                    minLength={8}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || !email || !password}>
                  {isSubmitting ? 'Securing…' : 'Access console'}
                </Button>
              </form>

              <Separator className="bg-border" />

              <div className="space-y-2 text-center text-sm text-muted-foreground">
                <p>
                  Not an administrator?{' '}
                  <button type="button" className="underline" onClick={onNavigateUserLogin}>
                    Go to member login
                  </button>
                </p>
                <p>
                  Need help? <a className="underline" href="mailto:support@wellbeingai.com">Contact support</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};
