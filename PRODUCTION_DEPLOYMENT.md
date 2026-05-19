# 🚀 ManaSarathi Production Deployment Guide

## Pre-Deployment Checklist

### Security ✅
- [ ] Remove `.env` file from git history (it contains secrets!)
- [ ] Rotate JWT_SECRET and SESSION_SECRET
- [ ] Verify all AI API keys are stored in environment variables only
- [ ] Enable HTTPS everywhere (frontend, backend, database)
- [ ] Set cookie security: httpOnly=true, secure=true, sameSite=strict
- [ ] Configure CORS to specific frontend domain(s) only
- [ ] Enable rate limiting on auth endpoints
- [ ] Enable CSRF protection on state-changing endpoints
- [ ] Configure firewall to block direct database access

### Database ✅
- [ ] Use PostgreSQL in production (NOT SQLite)
- [ ] Configure connection pooling (min: 5, max: 20)
- [ ] Set up automated backups (daily minimum)
- [ ] Enable query timeout (10-30 seconds)
- [ ] Add indexes on frequently queried columns
- [ ] Run database migrations: `npm run migrate:deploy`
- [ ] Set up database monitoring/alerts

### Environment Variables ✅
```bash
# REQUIRED for production
NODE_ENV=production
PORT=10000
DATABASE_URL="postgresql://..."
JWT_SECRET="<32+ random chars>"
SESSION_SECRET="<32+ random chars>"
FRONTEND_URL="https://..."
BACKEND_URL="https://..."

# API Keys
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
OPENAI_API_KEY_1="..."
GEMINI_API_KEY_1="..."
ANTHROPIC_API_KEY_1="..."

# AI Configuration
AI_PROVIDER_PRIORITY="openai,anthropic,gemini"
AI_TIMEOUT=30000
AI_MAX_TOKENS=600

# Logging
LOG_LEVEL="warn"
AI_VERBOSE_LOGGING="false"
```

### Build & Deployment ✅
- [ ] Run full test suite: `npm test`
- [ ] Check TypeScript: `npm run typecheck`
- [ ] Run ESLint: `npm run lint`
- [ ] Build backend: `npm run build`
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Test health endpoints: `/api/health` and `/api/health/ready`
- [ ] Verify production environment variables
- [ ] Test database migrations in staging

### Performance ✅
- [ ] Configure CDN for static assets (frontend)
- [ ] Enable gzip compression (done via helmet)
- [ ] Set up caching headers
- [ ] Monitor response times (target <500ms p95)
- [ ] Monitor database queries (target <100ms p95)
- [ ] Set up error tracking (Sentry/Rollbar)
- [ ] Monitor uptime/availability

### Monitoring & Logging ✅
- [ ] Configure centralized logging (ELK, Datadog, CloudWatch)
- [ ] Set up uptime monitoring
- [ ] Configure alerts for:
  - API response time > 1s
  - Error rate > 1%
  - Database connection pool exhaustion
  - Low disk space
  - High CPU/memory usage
- [ ] Set up dashboard for key metrics

## Deployment Steps

### Option 1: Render.com (Recommended)

```bash
# 1. Connect GitHub repository
# 2. Create PostgreSQL database
# 3. Deploy backend:

services:
  - type: web
    name: manasarthi-backend
    runtime: node
    buildCommand: npm install --include=dev && npm run db:generate && npm run db:push:auto && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: manasarthi-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: FRONTEND_URL
        value: https://your-frontend.com
      # Add all other required env vars

  # 4. Deploy frontend to Vercel
```

### Option 2: Vercel (Frontend) + Railway/Render (Backend)

```bash
# Frontend:
npm run build --workspace frontend
# Deploy dist/ folder to Vercel

# Backend:
# Deploy to Railway or Render with PostgreSQL
```

### Option 3: Docker + Kubernetes

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 10000
CMD ["npm", "start"]
```

```bash
# Build and push
docker build -t manasarthi-backend .
docker push your-registry/manasarthi-backend
```

## Post-Deployment

### Verify Deployment ✅
```bash
# Test health endpoints
curl https://api.your-domain.com/api/health
curl https://api.your-domain.com/api/health/ready

# Test authentication
curl -X POST https://api.your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"..."}'

# Test CORS
curl -H "Origin: https://your-frontend.com" \
  https://api.your-domain.com/api/health -v
```

### Monitor First 24 Hours
- [ ] Monitor error rates
- [ ] Check database connection pool
- [ ] Verify email notifications work
- [ ] Test user flows (signup, login, assessment)
- [ ] Monitor response times

### Database Optimization

Run these after deployment for best performance:

```sql
-- Analyze query performance
ANALYZE;

-- Create indexes for common queries
CREATE INDEX idx_users_email ON "User"(email);
CREATE INDEX idx_assessments_userId ON "AssessmentResult"("userId");
CREATE INDEX idx_assessments_createdAt ON "AssessmentResult"("createdAt" DESC);
CREATE INDEX idx_journalEntries_userId ON "JournalEntry"("userId");
CREATE INDEX idx_moodEntries_userId ON "MoodEntry"("userId", "createdAt" DESC);
CREATE INDEX idx_conversations_userId ON "Conversation"("userId");
CREATE INDEX idx_chatMessages_conversationId ON "ChatMessage"("conversationId");

-- Enable query monitoring
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1 second
SELECT pg_reload_conf();
```

## Troubleshooting

### 502 Bad Gateway
- Check backend service is running: `/api/health`
- Check logs for startup errors
- Verify database connection
- Check environment variables

### Database Connection Pool Exhausted
- Increase max connections in DATABASE_URL
- Check for connection leaks in application
- Review slow queries

### High Response Times
- Check database query performance
- Monitor AI provider response times
- Check network latency
- Review application logs

### CORS Errors
- Verify FRONTEND_URL in environment
- Check allowed origins configuration
- Ensure credentials: true in frontend fetch calls

## Rollback Plan

```bash
# If something goes wrong:

# 1. Revert to previous deployment
# 2. Check database migrations are backward-compatible
# 3. Test thoroughly in staging first

# Keep previous versions:
git tag -a v1.0.0-prod -m "Production release"
git push origin v1.0.0-prod
```

## Maintenance

### Weekly
- [ ] Review error logs
- [ ] Check database size
- [ ] Verify backups completed

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Review security advisories: `npm audit`
- [ ] Review and analyze logs
- [ ] Verify disaster recovery procedures

### Quarterly
- [ ] Performance optimization review
- [ ] Security audit
- [ ] Capacity planning
- [ ] Document runbooks

## Support

For issues:
1. Check application logs
2. Check health endpoints
3. Review recent deployments
4. Contact platform support (Render/Vercel)
