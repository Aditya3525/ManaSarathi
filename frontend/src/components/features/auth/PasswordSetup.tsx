import { 
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import React, { useState } from 'react';

import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

interface PasswordSetupProps {
  user: { name: string; email: string; firstName?: string; lastName?: string } | null;
  onComplete: (password: string) => void;
  onSkip?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function PasswordSetup({ user, onComplete, onSkip, isLoading, error }: PasswordSetupProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordChecks = {
    minLength: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z\d]/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = isPasswordValid && passwordsMatch && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onComplete(password);
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    const score = Object.values(passwordChecks).filter(Boolean).length;
    if (score <= 2) return { strength: 40, label: 'Weak', color: 'text-red-600' };
    if (score <= 4) return { strength: 75, label: 'Good', color: 'text-blue-600' };
    return { strength: 100, label: 'Strong', color: 'text-green-600' };
  };

  const passwordStrength = getPasswordStrength();

  // Handle case where user is not loaded yet
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your account...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'there';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">Secure Your Account</CardTitle>
            <p className="text-muted-foreground">
              Hi {userName}! To keep your wellbeing data safe, please set up a secure password.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Password strength:</span>
                    <span className={passwordStrength.color}>{passwordStrength.label}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all ${
                        passwordStrength.strength === 100 ? 'bg-green-500' :
                        passwordStrength.strength >= 75 ? 'bg-blue-500' :
                        passwordStrength.strength >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="pr-10"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              
              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="flex items-center gap-2 text-sm">
                  {passwordsMatch ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">Passwords don&apos;t match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium text-foreground">Password requirements:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  {passwordChecks.minLength ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                  )}
                  At least 8 characters
                </li>
                <li className="flex items-center gap-2">
                  {passwordChecks.upper ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                  )}
                  At least one uppercase letter
                </li>
                <li className="flex items-center gap-2">
                  {passwordChecks.lower ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                  )}
                  At least one lowercase letter
                </li>
                <li className="flex items-center gap-2">
                  {passwordChecks.number ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                  )}
                  At least one number
                </li>
                <li className="flex items-center gap-2">
                  {passwordChecks.special ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                  )}
                  At least one special character
                </li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={!canSubmit}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Setting up...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Secure My Account
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>

            {onSkip && (
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full"
                onClick={onSkip}
                disabled={isLoading}
              >
                Skip for now
              </Button>
            )}
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p>Your password is encrypted and securely stored.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
