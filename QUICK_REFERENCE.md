# ⚡ ManaSarathi Security & Stability - Quick Reference

## 🚀 Quick Start

### For Developers
```bash
# Setup local environment
cd backend
cp .env.local.example .env.local
# Edit .env.local with your local values
npm install
npm run dev

# Backend will validate all required env vars at startup
```

### For DevOps/Deployment
```bash
# Production checklist before deploying
✓ All env vars set (see PRODUCTION_DEPLOYMENT.md)
✓ JWT_SECRET, SESSION_SECRET are 32+ random characters
✓ DATABASE_URL points to PostgreSQL (not SQLite)
✓ FRONTEND_URL uses HTTPS
✓ Secrets stored in environment, NOT in code

# Deploy with:
npm run build  # Should complete with 0 errors
npm start      # Graceful shutdown on SIGTERM/SIGINT
```

---

## 🔐 Security Features

### Authentication & Sessions
| Feature | Location | Purpose |
|---------|----------|---------|
| **JWT Auto-Refresh** | `middleware/jwtRefresh.ts` | Seamless token renewal every 5 min before expiry |
| **CSRF Protection** | `middleware/csrf.ts` | Blocks cross-site request forgery on state-changing endpoints |
| **Secure Cookies** | `server.ts` session config | httpOnly, sameSite=strict, HTTPS-only in production |

### Attack Prevention
| Attack | Defense | Location |
|--------|---------|----------|
| **Brute Force** | Rate limiting (3-5 attempts/hour) | `middleware/authRateLimits.ts` |
| **XSS** | Input sanitization | `middleware/sanitization.ts` |
| **SQL/NoSQL Injection** | Pattern blocking | `middleware/sanitization.ts` |
| **Command Injection** | Metacharacter removal | `middleware/sanitization.ts` |
| **Prototype Pollution** | Object key validation | `middleware/sanitization.ts` |

### Infrastructure
| Feature | Location | Benefit |
|---------|----------|---------|
| **Request Timeout** | `middleware/timeoutAndCircuitBreaker.ts` | Prevents resource exhaustion (30s limit) |
| **Circuit Breaker** | `middleware/timeoutAndCircuitBreaker.ts` | Prevents cascading failures (5 failures → OPEN) |
| **Graceful Shutdown** | `utils/gracefulShutdown.ts` | Prevents data loss (waits for pending requests) |
| **Env Validation** | `utils/envValidation.ts` | Fails fast on misconfiguration |

---

## 📊 Rate Limiting Limits

```typescript
// Authentication endpoints
loginLimiter: 5 attempts per 15 minutes (keyed by IP + email)
registerLimiter: 3 attempts per hour (keyed by IP + email)
passwordResetLimiter: 3 attempts per hour (keyed by IP)
verificationResendLimiter: 5 attempts per hour (keyed by email)
oauthLimiter: 10 attempts per 15 minutes (keyed by IP)

// Returns: 429 Too Many Requests with Retry-After header
```

---

## 🛡️ Protected Endpoints

```
POST /api/auth/register → registerLimiter (3/hour)
POST /api/auth/login → loginLimiter (5/15min)
GET /api/auth/google → oauthLimiter (10/15min)
POST /api/auth/resend-verification → verificationResendLimiter (5/hour)
POST /api/auth/reset-password → passwordResetLimiter (3/hour)
ALL POST/PUT/PATCH/DELETE → CSRF token required
ALL requests → Input sanitization + timeout (30s)
```

---

## 📋 Environment Variables (Production)

### Required
```bash
NODE_ENV=production
PORT=10000
DATABASE_URL="postgresql://..."  # Must be PostgreSQL
JWT_SECRET="<32+ random chars>"
SESSION_SECRET="<32+ random chars>"
FRONTEND_URL="https://..."  # Must be HTTPS
BACKEND_URL="https://..."  # Must be HTTPS
```

### Optional but Recommended
```bash
LOG_LEVEL=warn          # not debug
AI_VERBOSE_LOGGING=false
COOKIE_DOMAIN=.example.com
```

### Validation
The server will fail to start if:
- Required vars are missing
- JWT_SECRET or SESSION_SECRET < 32 chars in production
- DATABASE_URL is SQLite in production
- FRONTEND_URL is HTTP (not HTTPS) in production

**See `.env.local.example` for complete list.**

---

## 🔄 Frontend Network Resilience

### Automatic Retry
All API calls automatically retry with exponential backoff:
```javascript
const response = await fetchWithRetry('/api/endpoint', options);
// Retries up to 3x on network errors or 5xx status codes
// Delay: 500ms → 1s → 2s (+ 10% random jitter)
```

### Token Refresh
Tokens automatically refresh when approaching expiration:
```javascript
const response = await api.getCurrentUser();
// Backend returns X-New-Token header if token near expiry
// Frontend automatically extracts and stores new token
// No user action required - seamless refresh
```

### Request Deduplication
Prevents concurrent identical requests:
```javascript
// Only 1 login request processes at a time
// Subsequent calls wait for first to complete
const response = await loginUser(email, password);
```

---

## 🏥 Health Checks

### Basic Health
```bash
curl http://localhost:5000/api/health
# Response: { status: 'OK', timestamp: '...', environment: 'production' }
```

### Readiness Check
```bash
curl http://localhost:5000/api/health/ready
# Response includes database, AI providers, session status
# Returns 503 if any critical dependency down
```

---

## 📈 Monitoring & Debugging

### Log Levels
```bash
LOG_LEVEL=debug      # Development: verbose debugging info
LOG_LEVEL=info       # Development: basic operational events
LOG_LEVEL=warn       # Production: warnings and above
LOG_LEVEL=error      # Production (strict): errors only
```

### Important Logs
```
JWT token auto-refreshed     → Token expiration approaching
JWT auto-refresh error       → Refresh failed, continuing with old token
CSRF token validation failed → Potential CSRF attack
Rate limit exceeded          → Too many requests from IP
Circuit breaker opened       → Service experiencing issues
Graceful shutdown started    → Server shutting down
```

---

## ⚙️ Middleware Chain (Order Matters)

```
Request → helmet (security headers)
       → compression
       → httpLogger
       → systemHealth
       → requestTimeout (30s) ⚠️ TIMEOUT HERE
       → sanitizeInputs (XSS/injection) ⚠️ SANITIZE HERE
       → requestTracker (for graceful shutdown)
       → cors (CORS headers)
       → rateLimiter (production only)
       → session (user session)
       → passport (authentication)
       → jwtAutoRefresh (token refresh) ⚠️ NEW TOKEN HERE
       → csrfProtection (CSRF validation) ⚠️ CSRF TOKEN HERE
       → jsonParser
       → routes
       → errorHandler
Response ← X-New-Token header (if refreshed)
         ← X-CSRF-Token header (if needed)
```

---

## 🧪 Testing Security

### Test CSRF Protection
```bash
# Should succeed (with valid CSRF token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/health | jq -r '.csrfToken')" \
  -d '{"email":"test@example.com","password":"test"}'
```

### Test Rate Limiting
```bash
# First 5 logins should succeed, 6th should return 429
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"password\":\"test\"}"
  sleep 1
done
```

### Test Request Timeout
```bash
# Should abort after 30 seconds with 408 status
curl -X GET "http://localhost:5000/api/test/slow?delay=40000" \
  --max-time 35
```

---

## 📦 Deployment Commands

### Build
```bash
cd backend && npm run build
# Produces: dist/ folder with compiled JavaScript
# Must complete with 0 TypeScript errors
```

### Run Production
```bash
# With environment variables
NODE_ENV=production \
PORT=10000 \
DATABASE_URL="..." \
JWT_SECRET="..." \
npm start

# Graceful shutdown:
kill -SIGTERM <pid>  # Waits for requests to complete
```

### Local Development
```bash
npm run dev
# Watch mode: auto-recompiles on file changes
# Hot reload enabled for faster development
```

---

## 🔗 Key Files Reference

### Security Middleware
- `middleware/jwtRefresh.ts` - Auto-refresh tokens
- `middleware/csrf.ts` - CSRF protection
- `middleware/authRateLimits.ts` - Rate limiters
- `middleware/sanitization.ts` - Input sanitization
- `middleware/timeoutAndCircuitBreaker.ts` - Timeout & resilience

### Configuration
- `config/auth.ts` - JWT & session configuration
- `config/database.ts` - Prisma client
- `config/allowedOrigins.ts` - CORS whitelist
- `utils/envValidation.ts` - Environment validation

### Frontend
- `utils/networkRetry.ts` - Retry logic & deduplication
- `services/auth.ts` - Auth API with retry

### Documentation
- `PRODUCTION_DEPLOYMENT.md` - Deployment procedures
- `SECURITY_STABILITY_AUDIT_SUMMARY.md` - Detailed audit
- `.env.local.example` - Environment template

---

## 🚨 Troubleshooting

### "Too many requests"
**Cause**: Rate limit exceeded
**Solution**: Wait for window to expire or adjust limits in `authRateLimits.ts`

### "CSRF token invalid"
**Cause**: Request missing X-CSRF-Token header
**Solution**: Ensure frontend extracts token from response and includes in requests

### "Request timeout"
**Cause**: Operation took > 30 seconds
**Solution**: Optimize long-running operations or increase timeout in `timeoutAndCircuitBreaker.ts`

### "Environment variable missing"
**Cause**: Required var not set at startup
**Solution**: Check `.env.local.example` and set all required variables

### "Database connection failed"
**Cause**: DATABASE_URL invalid or database unreachable
**Solution**: Verify connection string and database is running

### "JWT token validation failed"
**Cause**: Invalid or expired token
**Solution**: Logout and login again, token will auto-refresh

---

## 📞 Support

For issues:
1. Check logs: `LOG_LEVEL=debug npm run dev`
2. Test health endpoints: `/api/health` and `/api/health/ready`
3. Review relevant middleware for the failing endpoint
4. Check environment variables are set correctly
5. Review PRODUCTION_DEPLOYMENT.md for deployment issues

---

## 🎯 Next Priorities

Phase 2 (Recommended):
- [ ] Database indexes & query optimization
- [ ] Error response standardization
- [ ] Monitoring & alerting setup
- [ ] Comprehensive test coverage
- [ ] Security penetration testing

See `SECURITY_STABILITY_AUDIT_SUMMARY.md` for detailed next steps.
