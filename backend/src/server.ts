import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import pinoHttp from 'pino-http';
import passport from './config/passport';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import assessmentRoutes from './routes/assessments';
import planRoutes from './routes/plans';
import chatRoutes from './routes/chat';
import conversationRoutes from './routes/conversations';
import progressRoutes from './routes/progress';
import moodRoutes from './routes/mood';
import checkinRoutes from './routes/checkins';
import journalRoutes from './routes/journal';
import intentionRoutes from './routes/intentions';
import gratitudeRoutes from './routes/gratitude';
import sleepRoutes from './routes/sleep';
import habitRoutes from './routes/habits';
import contentRoutes from './routes/content';
import adminRoutes from './routes/admin';
import adminDataRoutes from './routes/adminData';
import publicPracticesRoutes from './routes/practices';
import publicContentRoutes from './routes/publicContent';
import engagementRoutes from './routes/engagement';
import dashboardRoutes from './routes/dashboard';
import chatbotRoutes from './routes/chatbot';
import supportRoutes from './routes/support';
import faqRoutes from './routes/faq';
import crisisRoutes from './routes/crisis';
import therapistRoutes from './routes/therapists';
import therapistPortalRoutes from './routes/therapistPortal';
import helpSafetyAdminRoutes from './routes/admin/helpSafetyAdmin';
import privacyRoutes from './routes/privacy';
import prisma from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { noStoreApiResponses } from './middleware/noStoreApi';
import { systemHealthMiddleware, startHealthMonitoring } from './middleware/systemHealthMiddleware';
import { getSessionSecret } from './config/auth';
import { getAllowedProductionOrigins, isAllowedFrontendOrigin } from './config/allowedOrigins';
import { logger, refreshLogLevelFromEnv } from './utils/logger';
import { llmService } from './services/llmProvider';

refreshLogLevelFromEnv();

const app = express();
const PORT = typeof process.env.PORT === 'string' ? parseInt(process.env.PORT, 10) : 5000;
// When deployed behind a proxy, trust it so secure cookies and IP work correctly
app.set('trust proxy', 1);

// Rate limiting (enabled only in production to avoid noisy 429s during local dev)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500'), // limit each IP to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) {
      return 'error';
    }

    if (res.statusCode >= 400) {
      return 'warn';
    }

    // Successful requests can be extremely noisy during local development
    // (frequent auth/session checks + ETag revalidation 304 responses).
    if (process.env.NODE_ENV !== 'production') {
      return 'debug';
    }

    return 'info';
  },
  genReqId: (req: IncomingMessage, _res: ServerResponse) => {
    const headerId = req.headers['x-request-id'];
    if (typeof headerId === 'string' && headerId.trim().length > 0) {
      return headerId.trim();
    }
    if (Array.isArray(headerId) && headerId.length > 0) {
      return headerId[0];
    }
    return randomUUID();
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(httpLogger);
app.use(systemHealthMiddleware); // Track API response times and system metrics
app.use((req, res, next) => {
  res.locals.requestId = (req as any).id;
  try {
    const sid = (req as any).sessionID;
    if (sid) logger.debug({ sid, reqId: (req as any).id }, 'session trace');
  } catch { }
  next();
});
// CORS must come before rate limiter so rate-limited 429 responses still carry CORS headers
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (origin, callback) => {
      if (!origin || isAllowedFrontendOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin not allowed: ${origin}`));
    }
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Platform'],
}));

logger.info({ origins: getAllowedProductionOrigins() }, 'configured production CORS origins');

// Rate limiter after CORS so 429 responses still carry CORS headers
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}

// Session middleware (required for passport)
app.use(session({
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(noStoreApiResponses);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Serve uploaded media statically
app.use('/uploads', express.static(uploadsDir));

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    requestId: (req as any).id
  });
});

app.get('/api/health/ready', async (req, res) => {
  const requestId = (req as any).id;
  const checks: {
    database: { status: 'pass' | 'fail'; error?: string };
    providers: Record<string, { available: boolean; name: string; cooldownActive: boolean; cooldownExpiresAt: string | null; lastError?: string }>;
  }
    = {
    database: { status: 'pass' },
    providers: {}
  };

  let databaseHealthy = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: any) {
    databaseHealthy = false;
    checks.database = {
      status: 'fail',
      error: error?.message ?? 'Database connectivity check failed'
    };
    logger.error({ err: error, requestId }, 'Database readiness check failed');
  }

  const providerStatus = await llmService.getProviderStatus();
  checks.providers = providerStatus;
  const providersHealthy = Object.values(providerStatus).some((status) => status.available);
  const localAiFallbackEnabled =
    process.env.NODE_ENV !== 'production' &&
    !['false', '0', 'off'].includes((process.env.AI_LOCAL_FALLBACK_ENABLED ?? 'true').trim().toLowerCase());

  const aiHealthy = providersHealthy || localAiFallbackEnabled;
  const isReady = databaseHealthy && aiHealthy;
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'degraded',
    requestId,
    checks,
    meta: {
      localAiFallbackEnabled,
      mode: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/intentions', intentionRoutes);
app.use('/api/gratitude', gratitudeRoutes);
app.use('/api/sleep', sleepRoutes);
app.use('/api/habits', habitRoutes);
// Mount engagement routes before generic content routes so /api/content/bookmarks is not shadowed by /api/content/:id.
app.use('/api/content', engagementRoutes); // For /api/content/:id/engage, /api/content/bookmarks, /api/content/:id/bookmark
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/help-safety', helpSafetyAdminRoutes); // Help & Safety admin management
app.use('/api/privacy', privacyRoutes);  // Privacy settings, data export, account deletion
app.use('/api/admin-data', adminDataRoutes); // For database CRUD operations
app.use('/api/practices', publicPracticesRoutes);
app.use('/api/public-content', publicContentRoutes);
app.use('/api/public/content', publicContentRoutes); // Backward-compatible alias
app.use('/api/dashboard', dashboardRoutes);
// Enhanced engagement & recommendation endpoints
app.use('/api/recommendations', engagementRoutes); // For /api/recommendations/personalized
app.use('/api/crisis', engagementRoutes); // For /api/crisis/check

// Help & Safety System Routes
app.use('/api/support', supportRoutes);       // Support tickets
app.use('/api/faq', faqRoutes);               // FAQ system
app.use('/api/crisis', crisisRoutes);         // Crisis resources & safety plans
app.use('/api/therapists', therapistRoutes);  // Therapist directory & bookings
app.use('/api/therapist-portal', therapistPortalRoutes); // Therapist self-service portal

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Server ready at http://localhost:${PORT}\n`);
    startHealthMonitoring(60000);
  });
}

export default app;
