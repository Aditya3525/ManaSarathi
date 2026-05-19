import express from 'express';
import passport from '../config/passport';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  getCurrentUser,
  googleAuthSuccess,
  googleAuthFailure,
  validateToken,
  verifyEmail,
  resendEmailVerification,
  setupPassword,
  updateProfile,
  logout,
  setSecurityQuestion,
  getSecurityQuestionForReset,
  resetPasswordWithSecurityAnswer,
  resetPasswordWithSecurityAnswerAuthenticated,
  updateSecurityQuestionWithPassword,
  updateApproachWithPassword
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/errorHandler';
import {
  registerSchema,
  loginSchema,
  passwordSetupSchema,
  updateProfileSchema,
} from '../api/validators';
import { prisma } from '../config/database';
import { isAllowedFrontendOrigin, normalizeOrigin } from '../config/allowedOrigins';
// NEW: Import specific auth rate limiters
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  verificationResendLimiter,
  oauthLimiter,
} from '../middleware/authRateLimits';

const router = express.Router();

const extractOrigin = (value: string): string => {
  try {
    return normalizeOrigin(new URL(value).origin);
  } catch {
    return '';
  }
};

const encodeOAuthState = (payload: { platform: 'web' | 'mobile'; frontendOrigin?: string }): string => {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

// NEW: Using specific rate limiters for each auth endpoint
// Traditional email/password routes
router.post('/register', registerLimiter, validate(registerSchema), asyncHandler(register));
router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(login));
router.get('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-verification', verificationResendLimiter, asyncHandler(resendEmailVerification));
router.post('/reset-password', passwordResetLimiter, asyncHandler(resetPasswordWithSecurityAnswer));
router.post('/reset-password/authenticated', authenticate, asyncHandler(resetPasswordWithSecurityAnswerAuthenticated));
router.post('/update-security-question', authenticate, asyncHandler(updateSecurityQuestionWithPassword));
router.post('/update-approach', authenticate, asyncHandler(updateApproachWithPassword));

// Google OAuth routes with rate limiting
router.get('/google', oauthLimiter, (req, res, next) => {
  const platform = req.query.platform === 'mobile' ? 'mobile' : 'web';
  let frontendOriginForState = '';

  if (platform === 'web') {
    const queryOrigin = typeof req.query.frontend_origin === 'string' ? extractOrigin(req.query.frontend_origin) : '';
    const refererOrigin = typeof req.headers.referer === 'string' ? extractOrigin(req.headers.referer) : '';
    const resolvedOrigin = queryOrigin || refererOrigin;

    if (resolvedOrigin && isAllowedFrontendOrigin(resolvedOrigin)) {
      frontendOriginForState = resolvedOrigin;
      (req.session as any).oauthWebOrigin = resolvedOrigin;
    }
  }

  const statePayload = platform === 'mobile'
    ? { platform: 'mobile' as const }
    : { platform: 'web' as const, frontendOrigin: frontendOriginForState || undefined };

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: encodeOAuthState(statePayload),
  })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/google/failure' }),
  asyncHandler(googleAuthSuccess)
);

router.get('/google/failure', googleAuthFailure);

// Mobile Google OAuth: Exchange authorization code for JWT token
// (Mobile apps can't use browser redirect flow, so they send a code from Google Sign-In SDK)
router.post('/google/mobile', asyncHandler(async (req, res) => {
  const { code, idToken, email, name, googleId, profilePhoto, firstName, lastName } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !googleId) {
    return res.status(400).json({
      success: false,
      error: 'Email and googleId are required for mobile Google auth',
    });
  }

  const db = prisma;

  try {
    // Find or create user by email
    let user = await db.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      // Update Google ID and profile info if needed
      const updateData: any = {};
      if (!user.googleId) updateData.googleId = googleId;
      if (!user.isEmailVerified) updateData.isEmailVerified = true;
      if (!user.profilePhoto && profilePhoto) updateData.profilePhoto = profilePhoto;
      if (!user.firstName && firstName) updateData.firstName = firstName;
      if (!user.lastName && lastName) updateData.lastName = lastName;

      if (Object.keys(updateData).length > 0) {
        user = await db.user.update({ where: { id: user.id }, data: updateData });
      }
    } else {
      // Create new user
      user = await db.user.create({
        data: {
          email: normalizedEmail,
          name: name || `${firstName || ''} ${lastName || ''}`.trim() || normalizedEmail.split('@')[0],
          googleId,
          profilePhoto: profilePhoto || null,
          firstName: firstName || null,
          lastName: lastName || null,
          isEmailVerified: true,
          isOnboarded: false,
          dataConsent: true,
        },
      });
    }

    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'dev-fallback-secret';
    const token = jwt.sign({ id: user.id }, secret, { expiresIn: process.env.JWT_EXPIRE || '7d' });

    const { password: _password, securityAnswerHash: _answerHash, ...safeUser } = user as any;

    res.json({
      success: true,
      data: {
        user: safeUser,
        token,
        needsOnboarding: !user.isOnboarded,
        needsPassword: !user.password,
      },
    });
  } finally {
    // Using shared prisma singleton — no disconnect needed
  }
}));

// Token validation
router.post('/validate', asyncHandler(validateToken));

// Google OAuth status check (for diagnostics) - No auth required
router.get('/google/status', asyncHandler(async (req, res) => {
  const hasClientId = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim());
  const hasClientSecret = !!(process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.trim());
  const configured = hasClientId && hasClientSecret;
  
  res.json({
    configured,
    clientIdPresent: hasClientId,
    clientSecretPresent: hasClientSecret,
    message: configured 
      ? 'Google OAuth is configured' 
      : 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env'
  });
}));

// Protected routes
router.get('/me', authenticate as any, asyncHandler(getCurrentUser));
router.post('/setup-password', authenticate as any, validate(passwordSetupSchema), asyncHandler(setupPassword));
router.post('/security-question', authenticate as any, asyncHandler(setSecurityQuestion));
router.put('/profile', authenticate as any, validate(updateProfileSchema), asyncHandler(updateProfile));
router.post('/security-question/update', authenticate as any, asyncHandler(updateSecurityQuestionWithPassword));
router.post('/password/reset-with-answer', authenticate as any, asyncHandler(resetPasswordWithSecurityAnswerAuthenticated));
router.post('/approach/update', authenticate as any, asyncHandler(updateApproachWithPassword));
router.post('/logout', asyncHandler(logout));

// Forgot password via security question
router.post('/forgot-password', asyncHandler(getSecurityQuestionForReset));
router.post('/reset-password', asyncHandler(resetPasswordWithSecurityAnswer));

export default router;
