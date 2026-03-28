import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './database';

interface User {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  isOnboarded: boolean;
}

// Configure Google OAuth Strategy (only if credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const baseUrl = (process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000').replace(/\/+$/, '');
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: `${baseUrl}/api/auth/google/callback`,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google Profile Data:', {
        id: profile.id,
        displayName: profile.displayName,
        emails: profile.emails,
        photos: profile.photos,
        name: profile.name
      });

    const email = (profile.emails?.[0]?.value || '').trim().toLowerCase();
    const name = profile.displayName || profile.name?.givenName + ' ' + profile.name?.familyName || '';
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';
    const profilePhoto = profile.photos?.[0]?.value || '';
    const googleId = profile.id;

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (user) {
      // User exists, update their Google ID and profile info if not set
      const updateData: any = {};
      
      if (!user.googleId) {
        updateData.googleId = googleId;
      }
      
      // Update profile photo if not set
      if (!user.profilePhoto && profilePhoto) {
        updateData.profilePhoto = profilePhoto;
      }

      // Update names if not set
      if (!user.firstName && firstName) {
        updateData.firstName = firstName;
      }
      
      if (!user.lastName && lastName) {
        updateData.lastName = lastName;
      }

      // If there are updates to make
      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });
      }
    } else {
      // Create new user with enhanced Google data
      user = await prisma.user.create({
        data: {
          email: email,
          name: name,
          googleId: googleId,
          profilePhoto: profilePhoto,
          isOnboarded: false,
          dataConsent: true, // Assume consent when using Google OAuth
          // Store additional Google data for pre-filling forms
          firstName: firstName,
          lastName: lastName
        }
      });
      // Flag so downstream handler knows this is a brand new Google account
      (user as any).justCreated = true;
    }

    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));
} else {
  console.log('Google OAuth not configured - Google login will be disabled');
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  // Persist minimal data and creation flag
  done(null, { id: user.id, justCreated: user.justCreated || false });
});

// Deserialize user from session
passport.deserializeUser(async (stored: any, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: stored.id },
      select: {
        id: true,
        name: true,
        email: true,
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
  updatedAt: true
      }
    });
    if (user) (user as any).justCreated = stored.justCreated;
    done(null, user);
  } catch (error) {
    done(error, false);
  }
});

export default passport;
