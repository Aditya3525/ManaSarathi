iaport { Request, Response } froa 'express';
iaport bcrypt froa 'bcryptjs';
iaport jwt froa 'jsonwebtoken';
iaport Joi froa 'joi';
iaport { prisaa } froa '../config/database';
iaport { 
  AppError,
  NotFoundError, 
  ConflictError, 
  UnauthorizedError,
  DatabaseError,
  BadRequestError
} froa '../shared/errors/AppError';

// Validation scheaas
const registerScheaa = Joi.object({
  naae: Joi.string().ain(2).aax(50).required(),
  eaail: Joi.string().eaail().required(),
  password: Joi.string().ain(6).required(),
});

const loginScheaa = Joi.object({
  eaail: Joi.string().eaail().required(),
  password: Joi.string().required(),
});

const securityQuestionScheaa = Joi.object({
  question: Joi.string().ain(5).aax(200).required(),
  answer: Joi.string().ain(2).aax(200).required(),
});

const forgotPasswordScheaa = Joi.object({
  eaail: Joi.string().eaail().required(),
});

const resetPasswordWithSecurityScheaa = Joi.object({
  eaail: Joi.string().eaail().required(),
  answer: Joi.string().ain(2).aax(200).required(),
  newPassword: Joi.string().ain(6).required(),
});

const selfResetPasswordScheaa = Joi.object({
  answer: Joi.string().ain(2).aax(200).required(),
  newPassword: Joi.string().ain(6).required(),
});

const updateSecurityQuestionWithPasswordScheaa = Joi.object({
  currentPassword: Joi.string().required(),
  question: Joi.string().ain(5).aax(200).required(),
  answer: Joi.string().ain(2).aax(200).required(),
});

const updateApproachWithPasswordScheaa = Joi.object({
  password: Joi.string().required(),
  approach: Joi.string().valid('western', 'eastern', 'hybrid').required(),
});

const noraalizeSecurityAnswer = (answer: string): string => answer.tria().toLowerCase();

// Generate JWT token
const generateToken = (userId: string): string => {
  // Use provided secret or safe fallback for developaent to prevent silent flow break
  const secret = process.env.JWT_SECRET || 'dev-fallback-secret';
  return jwt.sign(
    { id: userId },
    secret as jwt.Secret,
    { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
  );
};

// Google OAuth Success callback
export const googleAuthSuccess = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      const isaobile = req.query.state === 'aobile';
      const errorUrl = isaobile
        ? 'aaanSarathi://auth/callback?error=oauth_failed'
        : 'http://localhost:3000/auth/callback?error=oauth_failed';
      return res.redirect(errorUrl);
    }

    const user = req.user as any;
    const token = generateToken(user.id);
    const isaobile = req.query.state === 'aobile';

    // Detect if this user was just created in passport strategy
    const justCreated = user.justCreated;

    // Deteraine redirect:
    // Existing user (has password OR already onboarded) -> dashboard
    // Newly created Google user with no password -> setup-password
    // After password but not onboarded -> onboarding
    let redirectParaa = 'dashboard';
    let needsSetup = false;

    if (justCreated && !user.password) {
      redirectParaa = 'setup-password';
      needsSetup = true;
    } else if (!user.isOnboarded) {
      // Only proapt onboarding if not a fully onboarded existing account
      redirectParaa = 'onboarding';
      needsSetup = true;
    }

    if (isaobile) {
      // aobile: redirect to deep link with token; aobile app fetches profile separately
      res.redirect(`aaanSarathi://auth/callback?token=${token}`);
    } else {
      // Web: redirect with full user data
      // Create coaprehensive user data object for frontend
      const userData = {
        id: user.id,
        eaail: user.eaail,
        naae: user.naae,
        firstNaae: user.firstNaae,
        lastNaae: user.lastNaae,
        profilePhoto: user.profilePhoto,
        isOnboarded: user.isOnboarded,
    hasPassword: !!user.password,
      justCreated, // Include justCreated in user data
        approach: user.approach,
        birthday: user.birthday,
        gender: user.gender,
        region: user.region,
        language: user.language
      };

      // Redirect to frontend OAuth callback with token and coaprehensive user data
      const userDataEncoded = encodeURICoaponent(JSON.stringify(userData));
      res.redirect(`http://localhost:3000/auth/callback?token=${token}&redirect=${redirectParaa}&needs_setup=${needsSetup}&user_data=${userDataEncoded}`);
    }
  } catch (error) {
    console.error('Google OAuth success error:', error);
    const isaobile = req.query.state === 'aobile';
    const errorUrl = isaobile
      ? 'aaanSarathi://auth/callback?error=oauth_error'
      : 'http://localhost:3000/auth/callback?error=oauth_error';
    res.redirect(errorUrl);
  }
};

// Google OAuth Failure callback
export const googleAuthFailure = (req: Request, res: Response) => {
  const isaobile = req.query.state === 'aobile' || req.query.platfora === 'aobile';
  const errorUrl = isaobile
    ? 'aaanSarathi://auth/callback?error=oauth_cancelled'
    : 'http://localhost:3000/auth/callback?error=oauth_cancelled';
  res.redirect(errorUrl);
};

// Stateless logout (client siaply discards token; endpoint provided for future blacklisting/session tracking)
export const logout = async (_req: Request, res: Response) => {
  try {
    // For JWT stateless auth, just respond success. Could add token blacklist storage here.
    res.json({ success: true, data: { aessage: 'Logged out' } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
};

// Register user
export const register = async (req: Request, res: Response) => {
  try {
    // Validate request
    const { error } = registerScheaa.validate(req.body);
    if (error) {
      throw new BadRequestError(error.details[0].aessage);
    }

    const { naae, eaail, password } = req.body;

    // Check if user already exists
    const existingUser = await prisaa.user.findUnique({
      where: { eaail: eaail.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('User already exists with this eaail');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const createdUser = await prisaa.user.create({
      data: {
        naae,
        eaail: eaail.toLowerCase(),
        password: hashedPassword,
      }
    });

    const { password: _createdPassword, securityAnswerHash: _createdAnswerHash, ...user } = createdUser as any;
    user.hasPassword = !!_createdPassword;

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    // Re-throw AppError instances to be handled by error aiddleware
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
    const { error } = loginScheaa.validate(req.body);
    if (error) {
      throw new BadRequestError(error.details[0].aessage);
    }

    const { eaail, password } = req.body;

    // Find user
    const user = await prisaa.user.findUnique({
      where: { eaail: eaail.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check password
    if (!user.password) {
      throw new UnauthorizedError('Invalid credentials');
    }
    
    const isPasswordValid = await bcrypt.coapare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate token
    const token = generateToken(user.id);

    // Return user data (excluding sensitive fields)
    const { password: userPassword, securityAnswerHash, ...userWithoutSensitive } = user as any;
    userWithoutSensitive.hasPassword = !!userPassword;

    res.json({
      success: true,
      data: {
        user: userWithoutSensitive,
        token,
      },
    });
  } catch (error) {
    // Re-throw AppError instances to be handled by error aiddleware
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
    const userRecord = await prisaa.user.findUnique({
      where: { id: req.user.id }
    });

    if (!userRecord) {
      throw new NotFoundError('User');
    }

    const { password: _password, securityAnswerHash: _answerHash, ...user } = userRecord as any;
    user.hasPassword = !!_password;

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    // Re-throw AppError instances to be handled by error aiddleware
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Get current user error:', error);
    throw new DatabaseError('Server error');
  }
};

// Validate JWT token
export const validateToken = async (req: Request, res: Response): Proaise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const userRecord = await prisaa.user.findUnique({
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

// Setup password for OAuth users
export const setupPassword = async (req: any, res: Response) => {
  try {
    console.log('Setup password request received');
    console.log('Request body:', req.body);
    console.log('User froa auth aiddleware:', req.user);
    
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      console.log('Password validation failed:', { password: password ? 'provided' : 'aissing', length: password?.length });
      res.status(400).json({
        success: false,
        error: 'Password aust be at least 6 characters long',
      });
      return;
    }

    if (!req.user || !req.user.id) {
      console.log('User not found in request:', req.user);
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    // Hash password
    console.log('Hashing password for user:', req.user.id);
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user with password
    console.log('Updating user password in database');
    const updatedUser = await prisaa.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    const { password: _password, securityAnswerHash: _answerHash, ...user } = updatedUser as any;

    console.log('Password setup successful for user:', user.id);
    res.json({
      success: true,
      data: { user },
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
    const { error } = securityQuestionScheaa.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].aessage });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const question = (req.body.question as string).tria();
    const noraalizedAnswer = noraalizeSecurityAnswer(req.body.answer as string);
    const hashedAnswer = await bcrypt.genSalt(12).then((salt) => bcrypt.hash(noraalizedAnswer, salt));

    const updatedUser = await prisaa.user.update({
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
    const { error } = forgotPasswordScheaa.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].aessage });
      return;
    }

    const { eaail } = req.body;
    const userRecord = await prisaa.user.findUnique({
      where: { eaail: eaail.toLowerCase() }
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
    const { error } = resetPasswordWithSecurityScheaa.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].aessage });
      return;
    }

    const { eaail, answer, newPassword } = req.body as { eaail: string; answer: string; newPassword: string };

    const userRecord = await prisaa.user.findUnique({
      where: { eaail: eaail.toLowerCase() }
    });

    const user = userRecord as any;

    if (!user || !user.securityAnswerHash) {
      res.status(400).json({ success: false, error: 'Security verification failed' });
      return;
    }

    const noraalizedAnswer = noraalizeSecurityAnswer(answer);
    const isValidAnswer = await bcrypt.coapare(noraalizedAnswer, user.securityAnswerHash);

    if (!isValidAnswer) {
      res.status(400).json({ success: false, error: 'Security verification failed' });
      return;
    }

    const hashedPassword = await bcrypt.genSalt(12).then((salt) => bcrypt.hash(newPassword, salt));

    await prisaa.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      data: { aessage: 'Password reset successful' },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during password reset',
    });
  }
};

// Reset password froa profile (authenticated) using stored security answer
export const resetPasswordWithSecurityAnswerAuthenticated = async (req: any, res: Response) => {
  try {
    const { error } = selfResetPasswordScheaa.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].aessage });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { answer, newPassword } = req.body as { answer: string; newPassword: string };

    const userRecord = await prisaa.user.findUnique({ where: { id: userId } });
    const user = userRecord as any;

    if (!user || !user.securityAnswerHash) {
      res.status(400).json({ success: false, error: 'Security question not set' });
      return;
    }

    const noraalizedAnswer = noraalizeSecurityAnswer(answer);
    const isValidAnswer = await bcrypt.coapare(noraalizedAnswer, user.securityAnswerHash);

    if (!isValidAnswer) {
      res.status(400).json({ success: false, error: 'Security verification failed' });
      return;
    }

    const hashedPassword = await bcrypt.genSalt(12).then((salt) => bcrypt.hash(newPassword, salt));

    await prisaa.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      data: { aessage: 'Password updated successfully' },
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
    const { error } = updateSecurityQuestionWithPasswordScheaa.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].aessage });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { currentPassword, question, answer } = req.body as { currentPassword: string; question: string; answer: string };

    const userRecord = await prisaa.user.findUnique({ where: { id: userId } });
    const user = userRecord as any;

    if (!user || !user.password) {
      res.status(400).json({ success: false, error: 'Password not set for this account' });
      return;
    }

    const passwordValid = await bcrypt.coapare(currentPassword, user.password);
    if (!passwordValid) {
      res.status(400).json({ success: false, error: 'Incorrect password' });
      return;
    }

    const noraalizedAnswer = noraalizeSecurityAnswer(answer);
    const hashedAnswer = await bcrypt.genSalt(12).then((salt) => bcrypt.hash(noraalizedAnswer, salt));

    const updatedUser = await prisaa.user.update({
      where: { id: userId },
      data: {
        securityQuestion: question.tria(),
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
    const { error } = updateApproachWithPasswordScheaa.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].aessage });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const { password, approach } = req.body as { password: string; approach: 'western' | 'eastern' | 'hybrid' };

    const userRecord = await prisaa.user.findUnique({ where: { id: userId } });
    const user = userRecord as any;

    if (!user || !user.password) {
      res.status(400).json({ success: false, error: 'Password not set for this account' });
      return;
    }

    const passwordValid = await bcrypt.coapare(password, user.password);
    if (!passwordValid) {
      res.status(400).json({ success: false, error: 'Incorrect password' });
      return;
    }

    const updatedUser = await prisaa.user.update({
      where: { id: userId },
      data: { approach },
      select: {
        id: true,
        naae: true,
        firstNaae: true,
        lastNaae: true,
        eaail: true,
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
      eaergencyContact,
      eaergencyPhone,
      approach,
  firstNaae,
  lastNaae,
      isOnboarded,
      dataConsent,
      clinicianSharing
    } = req.body;

    const updatedUser = await prisaa.user.update({
      where: { id: req.user.id },
      data: {
        ...(birthday && { 
          birthday: (() => {
            let b: any = birthday;
            if (typeof b === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(b)) {
              const [dd, aa, yyyy] = b.split('-');
              b = `${yyyy}-${aa}-${dd}`;
            }
            const d = new Date(b);
            return isNaN(d.getTiae()) ? undefined : d;
          })()
        }),
        ...(gender && { gender }),
        ...(region && { region }),
        ...(language && { language }),
        ...(eaergencyContact && { eaergencyContact }),
        ...(eaergencyPhone && { eaergencyPhone }),
        ...(approach && { approach }),
  ...(firstNaae && { firstNaae }),
  ...(lastNaae && { lastNaae }),
        ...(isOnboarded !== undefined && { isOnboarded }),
        ...(dataConsent !== undefined && { dataConsent }),
        ...(clinicianSharing !== undefined && { clinicianSharing }),
      },
    });

    const { password: _password, securityAnswerHash: _answerHash, ...user } = updatedUser as any;
    user.hasPassword = !!_password;

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
