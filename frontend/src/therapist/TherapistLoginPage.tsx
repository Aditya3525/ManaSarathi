import { ArrowLeft, CheckCircle, Heart, KeyRound } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';

interface TherapistLoginPageProps {
    onTherapistLogin: (credentials: { email: string; password: string }) => Promise<void> | void;
    loginError?: string | null;
    onNavigateHome: () => void;
    onNavigateUserLogin: () => void;
}

export const TherapistLoginPage: React.FC<TherapistLoginPageProps> = ({
    onTherapistLogin,
    loginError,
    onNavigateHome,
    onNavigateUserLogin
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email || !password) return;

        setIsSubmitting(true);
        try {
            await Promise.resolve(onTherapistLogin({ email, password }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid min-h-screen lg:grid-cols-[1.1fr,1fr]">
            <section className="hidden bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-700 p-10 text-white lg:block">
                <div className="flex h-full flex-col justify-between">
                    <div className="space-y-8">
                        <Button
                            variant="ghost"
                            className="w-fit text-white/80 hover:text-white"
                            onClick={onNavigateHome}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to MaanSarathi
                        </Button>

                        <div className="space-y-6">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium uppercase tracking-wide text-white/90">
                                <Heart className="h-4 w-4" />
                                Therapist Portal
                            </span>
                            <h1 className="text-4xl font-semibold leading-tight text-white">
                                Your practice,<br />your patients,<br />one dashboard
                            </h1>
                            <p className="max-w-lg text-base text-white/80">
                                Manage your profile, review booking requests, and keep track of your client schedule — all in one place.
                            </p>
                        </div>

                        <div className="space-y-4 rounded-2xl bg-white/10 p-6 text-sm text-white/90">
                            <div className="flex items-center gap-3 font-semibold">
                                <CheckCircle className="h-4 w-4" />
                                What you can do here
                            </div>
                            <ul className="space-y-3">
                                <li>Review and approve / decline booking requests</li>
                                <li>Edit your bio, specialties, and availability</li>
                                <li>Track your upcoming sessions and client history</li>
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Therapist Login</p>
                        <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
                        <p className="text-sm text-muted-foreground">Sign in with the account linked to your therapist profile.</p>
                    </div>

                    <Card className="shadow-lg">
                        <CardHeader className="space-y-2 pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <KeyRound className="h-5 w-5 text-emerald-600" />
                                Therapist access
                            </CardTitle>
                            <CardDescription>Enter your credentials to open the portal.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5 px-6 pb-6">
                            {loginError && (
                                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                                    {loginError}
                                </div>
                            )}

                            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                                <div className="space-y-2">
                                    <Label htmlFor="therapist-email">Email</Label>
                                    <Input
                                        id="therapist-email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="therapist-password">Password</Label>
                                    <Input
                                        id="therapist-password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                    />
                                </div>

                                <Button type="submit" className="w-full bg-emerald-600 text-white hover:bg-emerald-700" disabled={isSubmitting || !email || !password}>
                                    {isSubmitting ? 'Signing in…' : 'Sign in to portal'}
                                </Button>
                            </form>

                            <Separator className="bg-border" />

                            <div className="space-y-2 text-center text-sm text-muted-foreground">
                                <p>
                                    Not a therapist?{' '}
                                    <button type="button" className="underline" onClick={onNavigateUserLogin}>
                                        Go to member login
                                    </button>
                                </p>
                                <p>
                                    Need help? <a className="underline" href="mailto:support@maansarathi.app">Contact support</a>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};
