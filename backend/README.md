# Backend Setup Guide

## Prerequisites

1. **Node.js 18+**
2. **PostgreSQL** database server

## Database Setup

### Option 1: Local PostgreSQL
1. Install PostgreSQL on your machine
2. Create a database named `mental_wellbeing_db`
3. Update the `DATABASE_URL` in `.env` file with your credentials

### Option 2: Docker PostgreSQL (Recommended)
```bash
# Run PostgreSQL in Docker
docker run --name MaanSarathi-postgres \
  -e POSTGRES_DB=mental_wellbeing_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:14
```

### Option 3: Cloud Database (Production)
Use services like:
- **Supabase** (recommended for free tier)
- **Railway**
- **PlanetScale**
- **AWS RDS**

## Installation & Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your database URL and other settings
```

3. **Generate Prisma client:**
```bash
npx prisma generate
```

4. **Run database migrations:**
```bash
npx prisma migrate dev --name init
```

5. **Start development server:**
```bash
npm run dev
```

## Environment Variables

Create a `.env` file with:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/mental_wellbeing_db"
JWT_SECRET="your_super_secret_jwt_key_change_in_production"
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user  
- `GET /api/auth/me` - Get current user (requires token)

### Core Endpoints
- `/api/users/*` - User management
- `/api/assessments/*` - Wellbeing assessments
- `/api/plans/*` - Personalized wellness plans
- `/api/chat/*` - AI chatbot conversations
- `/api/progress/*` - Progress tracking
- `/api/content/*` - Content library
- `/api/privacy/*` - Privacy settings, data export, account deletion
- `/api/support/*` - Support ticket creation and tracking
- `/api/therapist-portal/*` - Therapist login, profile, bookings, and stats

## Database Schema

The database includes tables for:
- **Users** - User accounts and profiles
- **Assessments** - Wellbeing assessment data
- **MoodEntries** - Daily mood tracking
- **PlanModules** - Wellness plan content
- **UserPlanModules** - User progress on plans
- **ChatMessages** - AI chatbot conversations
- **ProgressTracking** - Long-term progress metrics
- **Content** - Educational content and resources

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:reset` - Reset database (⚠️ deletes all data)

## Health Check

Once running, check: `GET http://localhost:5000/api/health`

## Next Steps

1. Set up your database (see Database Setup above)
2. Run migrations
3. Test the authentication endpoints
4. Integrate with your React frontend
5. Add additional API endpoints as needed

## Production Deployment

For production deployment:
1. Set `NODE_ENV=production`
2. Use a secure JWT secret
3. Use a production database
4. Enable SSL/HTTPS
5. Set up monitoring and logging
