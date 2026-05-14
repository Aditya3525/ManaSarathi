import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { prisma } from '../config/database';
import { getJwtSecret } from '../config/auth';
import { isAllowedFrontendOrigin } from '../config/allowedOrigins';
import { 
  AppError,
  NotFoundError, 
  ConflictError, 
  DatabaseError,
  BadRequestError
} from '../shared/errors/AppError';
import { validateRegistrationEmail } from '../utils/emailValidation';
import { STRONG_PASSWORD_MESSAGE, STRONG_PASSWORD_REGEX, isStrongPassword } from '../shared/auth/passwordPolicy';

// Validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().pattern(STRONG_PASSWORD_REGEX).required().messages({
    'string.pattern.base': STRONG_PASSWORD_MESSAGE,
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const securityQuestionSchema = Joi.object({
  question: Joi.string().min(5).max(200).required(),
  answer: Joi.string().min(2).max(200).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordWithSecuritySchema = Joi.object({
  email: Joi.string().email().required(),
  answer: Joi.string().min(2).max(200).required(),
  newPassword: Joi.string().pattern(STRONG_PASSWORD_REGEX).required().messages({
    'string.pattern.base': STRONG_PASSWORD_MESSAGE,
  }),
});

const selfResetPasswordSchema = Joi.object({
  answer: Joi.string().min(2).max(200).required(),
  newPassword: Joi.string().pattern(STRONG_PASSWORD_REGEX).required().messages({
    'string.pattern.base': STRONG_PASSWORD_MESSAGE,
  }),
});

const updateSecurityQuestionWithPasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  question: Joi.string().min(5).max(200).required(),
  answer: Joi.string().min(2).max(200).required(),
});

const updateApproachWithPasswordSchema = Joi.object({
  password: Joi.string().required(),
  approach: Joi.string().valid('western', 'eastern', 'hybrid').required(),
});

const normalizeSecurityAnswer = (answer: string): string => answer.trim().toLowerCase();
const getFrontendBaseUrl = (): string => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

const buildVerificationRedirectUrl = (status: 'success' | 'expired' | 'invalid', email?: string): string => {
  const params = new URLSearchParams();

  if (status === 'success') {
    params.set('email_verified', '1');
  } else {
    params.set('email_verification', status);
  }

  if (email) {
    params.set('email', email);
  }

  return `${getFrontendBaseUrl()}/user_login?${params.toString()}`;
};

const getOAuthOriginFromState = (req: Request): string | null => {
  const rawState = typeof req.query.state === 'string' ? req.query.state : '';
  if (!rawState) return null;

  try {
    const decoded = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8')) as {
      platform?: string;
      frontendOrigin?: string;
    };

    if (decoded.platform !== 'web') {
      return null;
    }

    if (typeof decoded.frontendOrigin === 'string' && isAllowedFrontendOrigin(decoded.frontendOrigin)) {
      return decoded.frontendOrigin.replace(/\/+$/, '');
    }
  } catch {
    return null;
  }

  return null;
};

const getOAuthFrontendBaseUrl = (req: Request): string => {
  const stateOrigin = getOAuthOriginFromState(req);
  if (stateOrigin) {
    return stateOrigin;
  }

  const sessionOrigin = (req.session as any)?.oauthWebOrigin;
  if (typeof sessionOrigin === 'string' && isAllowedFrontendOrigin(sessionOrigin)) {
    return sessionOrigin.replace(/\/+$/, '');
  }
  return getFrontendBaseUrl();
};

// Generate JWT token
const generateToken = (userId: string): string => {
  const secret = getJwtSecret();
  return jwt.sign(
    { id: userId },
    secret as jwt.Secret,
    { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
  );
};

// Google OAuth Success callback
export const googleAuthSuccess = async (req: Request, res: Response) => {
  try {
    const frontendBaseUrl = getOAuthFrontendBaseUrl(req);
    if ((req.session as any)?.oauthWebOrigin) {
      delete (req.session as any).oauthWebOrigin;
    }
    if (!req.user) {
      return res.redirect(`${frontendBaseUrl}/auth/callback?error=oauth_failed`);
    }

    const user = req.user as any;
    const justCreated = Boolean(user.justCreated);

    // Re-read from DB for canonical account state. req.user may not include password
    // depending on passport serialization/deserialization path.
    const canonicalUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        name: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        isOnboarded: true,
        approach: true,
        birthday: true,
        gender: true,
        region: true,
        language: true,
        emergencyContact: true,
        emergencyPhone: true,
        dataConsent: true,
        clinicianSharing: true,
        createdAt: true,
        updatedAt: true,
        password: true,
      }
    });

    if (!canonicalUser) {
      return res.redirect(`${frontendBaseUrl}/auth/callback?error=oauth_failed`);
    }

    const token = generateToken(canonicalUser.id);
    const hasPassword = Boolean(canonicalUser.password);

    let redirectParam = 'dashboard';
    let needsSetup = false;

    if (!hasPassword) {
      redirectParam = 'setup-password';
      needsSetup = true;
    } else if (!canonicalUser.isOnboarded) {
      redirectParam = 'onboarding';
      needsSetup = true;
    }

    // Create comprehensive user data object for frontend
    const userData = {
      id: canonicalUser.id,
      email: canonicalUser.email,
      isEmailVerified: canonicalUser.isEmailVerified,
      name: canonicalUser.name,
      firstName: canonicalUser.firstName,
      lastName: canonicalUser.lastName,
      profilePhoto: canonicalUser.profilePhoto,
      isOnboarded: canonicalUser.isOnboarded,
      hasPassword,
      justCreated,
      approach: canonicalUser.approach,
      birthday: canonicalUser.birthday,
      gender: canonicalUser.gender,
      region: canonicalUser.region,
      language: canonicalUser.language,
      emergencyContact: canonicalUser.emergencyContact,
      emergencyPhone: canonicalUser.emergencyPhone,
      dataConsent: canonicalUser.dataConsent,
      clinicianSharing: canonicalUser.clinicianSharing,
      createdAt: canonicalUser.createdAt,
      updatedAt: canonicalUser.updatedAt,
    };

    // Redirect to frontend OAuth callback with token and comprehensive user data
    const userDataEncoded = encodeURIComponent(JSON.stringify(userData));
    res.redirect(`${frontendBaseUrl}/auth/callback?token=${token}&redirect=${redirectParam}&needs_setup=${needsSetup}&user_data=${userDataEncoded}`);
  } catch (error) {
    console.error('Google OAuth success error:', error);
    res.redirect(`${getFrontendBaseUrl()}/auth/callback?error=oauth_error`);
  }
};

// Google OAuth Failure callback
export const googleAuthFailure = (req: Request, res: Response) => {
  const frontendBaseUrl = getOAuthFrontendBaseUrl(req);
  if ((req.session as any)?.oauthWebOrigin) {
    delete (req.session as any).oauthWebOrigin;
  }
  res.redirect(`${frontendBaseUrl}/auth/callback?error=oauth_cancelled`);
};

// Stateless logout (client simply discards token; endpoint provided for future blacklisting/session tracking)
export const logout = async (_req: Request, res: Response) => {
  try {
    // For JWT stateless auth, just respond success. Could add token blacklist storage here.
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
};

// Register user
export const register = async (req: Request, res: Response) => {
  try {
    // Validate request
    const { error } = registerSchema.validate(req.body);
    if (error) {
      throw new BadRequestError(error.details[0].message);
    }

    const { name, email, password } = req.body;
    const emailValidation = validateRegistrationEmail(email);
    if (!emailValidation.isValid) {
      throw new BadRequestError(emailValidation.message || 'Invalid email address');
    }

    const normalizedEmail = emailValidation.normalizedEmail;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictError('User already exists with this email');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const createdUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        isEmailVerified: true,
      }
    });

    const token = generateToken(createdUser.id);
    const { password: _password, securityAnswerHash: _answerHash, ...userWithoutSensitive } = createdUser as any;
    const userResponse = {
      ...userWithoutSensitive,
      hasPassword: !!createdUser.password,
      isEmailVerified: true,
    };

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    // Re-throw AppError instances to be handled by error middleware
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Registration error:', error);
    throw new DatabaseError('Server error during registration');
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    // Validate request
    const { error } = loginSchema.validate(req.body);
    if (error) {
      throw new BadRequestError(error.details[0].message);
    }

    const { email, password } = req.body;

    const sendInvalidCredentialResponse = () => {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        suggestion: 'check_credentials',
        message: 'Please check your credentials and try again.',
      });
    };

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      sendInvalidCredentialResponse();
      return;
    }

    // Check password
    if (!user.password) {
      sendInvalidCredentialResponse();
      return;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      sendInvalidCredentialResponse();
      return;
    }

    // Generate token
    const token = generateToken(user.id);

    // Return user data (excluding sensitive fields)
    const { password: userPassword, securityAnswerHash, ...userWithoutSensitive } = user as any;
    const userResponse = {
      ...userWithoutSensitive,
      hasPassword: !!userPassword,
      isEmailVerified: !!user.isEmailVerified,
    };

    res.json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    // Re-throw AppError instances to be handled by error middleware
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Login error:', error);
    throw new DatabaseError('Server error during login');
  }
};

// Get current user
export const getCurrentUser = async (req: any, res: Response) => {
  try {
    const userRecord = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!userRecord) {
      throw new NotFoundError('User');
    }

    const { password: _password, securityAnswerHash: _answerHash, ...user } = userRecord as any;
    const userResponse = {
      ...user,
      hasPassword: !!(userRecord as any).password,
    };

    res.json({
      success: true,
      data: { user: userResponse },
    });
  } catch (error) {
    // Re-throw AppError instances to be handled by error middleware
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Get current user error:', error);
    throw new DatabaseError('Server error');
  }
};

// Validate JWT token
export const validateToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as any;
    const userRecord = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!userRecord) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { password, securityAnswerHash, ...safeUser } = userRecord as any;
    (safeUser as any).hasPassword = !!password;
    res.json(safeUser);
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const email = typeof req.query.email === 'string' ? req.query.email : undefined;
  res.redirect(buildVerificationRedirectUrl('success', email));
};

export const resendEmailVerification = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      verificationSent: false,
      message: 'Email verification is no longer required. You can log in directly.',
    },
  });
};

// Setup password for OAuth users
export const setupPassword = async (req: any, res: Response) => {
  try {
    const { password } = req.body;
    
    if (!password || !isStrongPassword(password)) {
      res.status(400).json({
        success: false,
        error: STRONG_PASSWORD_MESSAGE,
      });
      return;
    }

    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user with password
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    const { password: _password, securityAnswerHash: _answerHash, ...user } = updatedUser as any;
    const userResponse = {
      ...user,
      hasPassword: !!updatedUser.password,
    };

    res.json({
      success: true,
      data: { user: userResponse },
    });
  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during password setup',
    });
  }
};

// Save or update a user's security question and answer
export const setSecurityQuestion = async (req: any, res: Response) => {
  try {
    const { error } = securityQuestionSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const question = (req.body.question as string).trim();
    const normalizedAnswer = normalizeSecurityAnswer(req.body.answer as string);
    const hashedAnswer = await bcrypt.genSalt(12).then((salt) => bcrypt.hash(normalizedAnswer, salt));

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        securityQuestion: question,
        securityAnswerHash: hashedAnswer,
      } as any
    });

    const { password: _password, securityAnswerHash: _answerHash, ...user } = updatedUser as any;

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Set security question error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while saving security question',
    });
  }
};

// Provide a user's security question during forgot password flow
export const getSecurityQuestionForReset = async (req: Request, res: Response) => {
  try {
    const { error } = forgotPasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    const { email } = req.body;
    const userRecord = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    const user = userRecord as any;

    if (!user || !user.securityQuestion || !user.securityAnswerHash) {
      res.json({ success: true, data: { questionAvailable: false } });
      return;
    }

    res.json({
      success: true,
      data: {
        questionAvailable: true,
        question: user.securityQuestion,
      }
    });
  } catch (error) {
    console.error('Get security question error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving security question',
    });
  }
};

// Reset password after verifying security question answer
export const resetPasswordWithSecurityAnswer = async (req: Request, res: Response) => {
  try {
    const { error } = resetPasswordWithSecuritySchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    const { email, answer, newPassword } = req.body as { email: string; answer: string; newPassword: string };

    const userRecord = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    const user = userRecord as any;

    if (!user || !user.securityAnswerHash) {
      res.status(400).json({ success: false, error: 'Security verification failed' });
      return;
    }

    const normalizedAnswer = normalizeSecurityAnswer(answer);
    const isValidAnswer = await bcrypt.compare(normalizedAnswer, user.securityAnswerHash);

    if (!isValidAnswer) {
      res.status(400).json({ success: false, error: 'Security verification failed' });
      return;
    }

    const hashedPassword = await bcrypt.genSalt(12).then((salt) => bcrypt.hash(newPassword, salt));

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      data: { message: 'Password reset successful' },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during password reset',
    });
  }
};

// Reset password from profile (authenticated) using stored security answer
export const resetPasswordWithSecurityAnswerAuthenticated = async (req: any, res: Response) => {
  try {
    const { error } = selfResetPasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { answer, newPassword } = req.body as { answer: string; newPassword: string };

    const userRecord = await prisma.user.findUnique({ where: { id: userId } });
    const user = userRecord as any;

    if (!user || !user.securityAnswerHash) {
      res.status(400).json({ success: false, error: 'Security question not set' });
      return;
    }

    const normalizedAnswer = normalizeSecurityAnswer(answer);
    const isValidAnswer = await bcrypt.compare(normalizedAnswer, user.securityAnswerHash);

    if (!isValidAnswer) {
      res.status(400).json({ success: false, error: 'Security verification failed' });
      return;
    }

    const hashedPassword = await bcrypt.genSalt(12).then((salt) => bcrypt.hash(newPassword, salt));

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      data: { message: 'Password updated successfully' },
    });
  } catch (error) {
    console.error('Authenticated password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during password update',
    });
  }
};

// Update security question after verifying password
export const updateSecurityQuestionWithPassword = async (req: any, res: Response) => {
  try {
    const { error } = updateSecurityQuestionWithPasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { currentPassword, question, answer } = req.body as { currentPassword: string; question: string; answer: string };

    const userRecord = await prisma.user.findUnique({ where: { id: userId } });
    const user = userRecord as any;

    if (!user || !user.password) {
      res.status(400).json({ success: false, error: 'Password not set for this account' });
      return;
    }

    const passwordValid = await bcrypt.compare(currentPassword, user.password);
    if (!passwordValid) {
      res.status(400).json({ success: false, error: 'Incorrect password' });
      return;
    }

    const normalizedAnswer = normalizeSecurityAnswer(answer);
    const hashedAnswer = await bcrypt.genSalt(12).then((salt) => bcrypt.hash(normalizedAnswer, salt));

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        securityQuestion: question.trim(),
        securityAnswerHash: hashedAnswer,
      },
    });

    const { password: _password, securityAnswerHash: _answerHash, ...safeUser } = updatedUser as any;

    res.json({
      success: true,
      data: { user: safeUser },
    });
  } catch (error) {
    console.error('Update security question with password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating security question',
    });
  }
};

// Update approach after verifying password
export const updateApproachWithPassword = async (req: any, res: Response) => {
  try {
    const { error } = updateApproachWithPasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { password, approach } = req.body as { password: string; approach: 'western' | 'eastern' | 'hybrid' };

    const userRecord = await prisma.user.findUnique({ where: { id: userId } });
    const user = userRecord as any;

    if (!user || !user.password) {
      res.status(400).json({ success: false, error: 'Password not set for this account' });
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      res.status(400).json({ success: false, error: 'Incorrect password' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { approach },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        approach: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Update approach with password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating approach',
    });
  }
};

// Update user profile during onboarding
export const updateProfile = async (req: any, res: Response) => {
  try {
    const {
      birthday,
      gender,
      region,
      language,
      emergencyContact,
      emergencyPhone,
      approach,
  firstName,
  lastName,
      isOnboarded
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(birthday && { 
          birthday: (() => {
            let b: any = birthday;
            if (typeof b === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(b)) {
              const [dd, mm, yyyy] = b.split('-');
              b = `${yyyy}-${mm}-${dd}`;
            }
            const d = new Date(b);
            return isNaN(d.getTime()) ? undefined : d;
          })()
        }),
        ...(gender && { gender }),
        ...(region && { region }),
        ...(language && { language }),
        ...(emergencyContact && { emergencyContact }),
        ...(emergencyPhone && { emergencyPhone }),
        ...(approach && { approach }),
  ...(firstName && { firstName }),
  ...(lastName && { lastName }),
        ...(isOnboarded !== undefined && { isOnboarded }),
      },
    });

    const { password: _password, securityAnswerHash: _answerHash, ...user } = updatedUser as any;

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during profile update',
    });
  }
};
