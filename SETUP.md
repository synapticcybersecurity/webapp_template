# WebApp Template - Setup Instructions

Complete step-by-step guide to set up and run the webapp template.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** (for version control)

Verify installations:
```bash
node --version  # Should be v20.x or higher
npm --version   # Should be 10.x or higher
docker --version
docker-compose --version
```

## Step 1: Clone and Install

### 1.1 Clone the Repository (or use this template)

```bash
# If using as a template, you've already done this
cd webapp_template

# Verify you're in the right directory
ls -la
# You should see: apps/, packages/, docker/, package.json, etc.
```

### 1.2 Install Dependencies

Install all dependencies for the monorepo (this includes backend, frontend, and shared packages):

```bash
npm install
```

This will install dependencies for:
- Root workspace
- Backend (`apps/backend`)
- Frontend (`apps/frontend`)
- Shared package (`packages/shared`)

**Expected output:** Installation should complete without errors. You may see some warnings about deprecated packages - these are normal.

## Step 2: Configure Environment Variables

### 2.1 Root Environment Variables

The root `.env.example` is already configured for Docker Compose. No changes needed for local development.

```bash
# Verify the file exists
cat .env.example
```

### 2.2 Backend Environment Variables

```bash
# Navigate to backend directory
cd apps/backend

# Copy the example file
cp .env.example .env

# Edit the .env file
nano .env  # or use your preferred editor
```

**Required Changes for Local Development:**

```bash
# Database - Already configured for Docker, no changes needed
DATABASE_URL="postgresql://webapp_user:webapp_password@localhost:5432/webapp_db"

# Redis - Already configured for Docker, no changes needed
REDIS_URL="redis://localhost:6379"

# Server
PORT=3001
NODE_ENV=development

# Better Auth - CHANGE THIS SECRET!
BETTER_AUTH_SECRET="your-secret-key-min-32-chars-change-this-in-production"
BETTER_AUTH_URL="http://localhost:3001"

# Email (Postmark) - UPDATE THESE
POSTMARK_API_KEY="your-postmark-api-key-here"
FROM_EMAIL="noreply@yourdomain.com"
FROM_NAME="Your App Name"

# Frontend URL
FRONTEND_URL="http://localhost:5173"
```

**Important Notes:**
- **BETTER_AUTH_SECRET**: Generate a secure random string (minimum 32 characters). You can use: `openssl rand -base64 32`
- **POSTMARK_API_KEY**: Sign up at [Postmark](https://postmarkapp.com) for a free account to get an API key
- **FROM_EMAIL**: Must be verified in your Postmark account

### 2.3 Frontend Environment Variables

```bash
# Navigate to frontend directory (from backend)
cd ../frontend

# Copy the example file
cp .env.example .env

# The defaults should work fine for local development
cat .env
```

**Frontend .env (defaults are fine):**
```bash
VITE_API_URL="http://localhost:3001"
VITE_ENABLE_ORGANIZATIONS=true
```

### 2.4 Return to Root Directory

```bash
cd ../..  # Back to project root
pwd       # Should show: .../webapp_template
```

## Step 3: Start Docker Services

### 3.1 Start PostgreSQL, Redis, and pgAdmin

```bash
npm run docker:up
```

**What this does:**
- Starts PostgreSQL 16 on port 5432
- Starts Redis 7 on port 6379
- Starts pgAdmin on port 5050

**Verify services are running:**
```bash
docker ps
```

You should see three containers running:
- `webapp-postgres`
- `webapp-redis`
- `webapp-pgadmin`

### 3.2 Wait for PostgreSQL to be Ready

Wait about 10 seconds for PostgreSQL to fully initialize. You can check logs:

```bash
docker logs webapp-postgres
```

Look for: "database system is ready to accept connections"

## Step 4: Set Up the Database

### 4.1 Generate Prisma Client

```bash
cd apps/backend
npm run prisma:generate
```

This generates the TypeScript types for database access.

### 4.2 Run Database Migrations

```bash
npm run prisma:migrate dev
```

**What this does:**
- Creates all database tables
- Sets up the Better Auth schema
- Creates tables for organizations, projects, tasks

**Expected output:**
```
✔ Generated Prisma Client
✔ The migration has been created successfully
```

### 4.3 Seed the Database

```bash
npm run prisma:seed
```

**What this creates:**
- Admin user (admin@example.com)
- Two regular users (user1@example.com, user2@example.com)
- Two organizations with members
- Sample projects and tasks

**Expected output:**
```
🌱 Database seeded successfully!
✅ Created admin user
✅ Created regular users
✅ Created organizations
✅ Created sample projects and tasks
```

### 4.4 Return to Root

```bash
cd ../..
```

## Step 5: Build the Shared Package

The shared package contains TypeScript types and validation schemas used by both frontend and backend.

```bash
cd packages/shared
npm run build
cd ../..
```

## Step 6: Start Development Servers

### 6.1 Start Both Frontend and Backend

From the root directory:

```bash
npm run dev
```

This starts both servers concurrently:
- **Backend:** http://localhost:3001
- **Frontend:** http://localhost:5173

**Expected output:**
```
[backend] Server started on port 3001
[backend] Database connected
[frontend] VITE v5.x.x ready in xxx ms
[frontend] ➜ Local: http://localhost:5173/
```

### 6.2 Alternative: Start Servers Separately

If you prefer to run them in separate terminals:

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

## Step 7: Access the Application

### 7.1 Open the Application

Navigate to: **http://localhost:5173**

You should see the login page.

### 7.2 Log In with Test Credentials

**Admin Account:**
- Email: `admin@example.com`
- Password: `Admin123!`

**Regular User Account:**
- Email: `user1@example.com`
- Password: `User123!`

### 7.3 Explore the Application

After logging in, you can:
- View the dashboard with stats and activity
- Edit your profile at `/profile`
- View organizations at `/organizations`
- Access admin panel at `/admin/users` (admin only)

## Step 8: Verify Everything Works

### 8.1 Test Authentication

1. Go to http://localhost:5173
2. Click "Sign up"
3. Register a new account
4. Check that you see "Check your email" message
5. (Note: Email won't actually send without valid Postmark credentials)

### 8.2 Test Protected Routes

1. Log out
2. Try to access http://localhost:5173/dashboard
3. You should be redirected to login

### 8.3 Test Admin Features

1. Log in as admin (admin@example.com / Admin123!)
2. Go to `/admin/users`
3. You should see the user management interface

### 8.4 Check Backend API

Visit: http://localhost:3001/api/auth/session

You should see either:
- `{"session":null,"user":null}` (if not logged in)
- Your session data (if logged in)

## Step 9: Access Database Tools

### 9.1 Prisma Studio (Recommended)

Prisma Studio is a visual database browser:

```bash
cd apps/backend
npm run prisma:studio
```

Opens at: **http://localhost:5555**

You can browse and edit all database tables here.

### 9.2 pgAdmin (Alternative)

Access pgAdmin at: **http://localhost:5050**

**Credentials:**
- Email: `admin@admin.com`
- Password: `admin`

**To connect to PostgreSQL:**
1. Right-click "Servers" → "Register" → "Server"
2. General tab: Name = `WebApp DB`
3. Connection tab:
   - Host: `postgres` (Docker network name)
   - Port: `5432`
   - Database: `webapp_db`
   - Username: `webapp_user`
   - Password: `webapp_password`

## Troubleshooting

### Port Already in Use

**Problem:** Port 3001, 5173, 5432, or 6379 already in use

**Solution:**
```bash
# Find what's using the port (example for 3001)
lsof -ti:3001

# Kill the process
lsof -ti:3001 | xargs kill -9

# Or change the port in environment variables
```

### Docker Services Won't Start

**Problem:** Docker containers fail to start

**Solution:**
```bash
# Stop all containers
npm run docker:down

# Remove volumes and start fresh
docker-compose -f docker/docker-compose.yml down -v

# Start again
npm run docker:up

# Re-run migrations
cd apps/backend
npm run prisma:migrate dev
npm run prisma:seed
```

### Database Connection Error

**Problem:** Backend can't connect to PostgreSQL

**Solution:**
1. Verify Docker is running: `docker ps`
2. Check PostgreSQL logs: `docker logs webapp-postgres`
3. Verify DATABASE_URL in `apps/backend/.env`
4. Wait 10-15 seconds after starting Docker services

### Prisma Client Not Generated

**Problem:** TypeScript errors about Prisma Client

**Solution:**
```bash
cd apps/backend
npm run prisma:generate
```

### Frontend Build Errors

**Problem:** Frontend won't start or build

**Solution:**
```bash
# Clear node_modules
cd apps/frontend
rm -rf node_modules
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Try building
npm run build
```

### Email Not Sending

**Problem:** Verification emails not arriving

**Solution:**
- For development, email verification is optional
- To actually send emails:
  1. Sign up at https://postmarkapp.com (free tier available)
  2. Get your Server API Token
  3. Add to `apps/backend/.env`: `POSTMARK_API_KEY="your-token"`
  4. Verify your FROM_EMAIL in Postmark dashboard

### Cannot Find Module Errors

**Problem:** Import errors for shared package

**Solution:**
```bash
# Rebuild shared package
cd packages/shared
npm run build

# Restart backend
cd ../../apps/backend
npm run dev
```

## Next Steps

Now that your application is running:

1. **Customize the Branding**
   - Update app name in `apps/frontend/src/components/layout/Header.tsx`
   - Change colors in `apps/frontend/tailwind.config.js`

2. **Add Your Domain**
   - Update BETTER_AUTH_URL in backend .env
   - Update FRONTEND_URL in backend .env
   - Update VITE_API_URL in frontend .env

3. **Set Up Email**
   - Get Postmark API key
   - Verify your sender email
   - Test email verification flow

4. **Start Building**
   - Add new pages in `apps/frontend/src/pages/`
   - Add new API endpoints in `apps/backend/src/controllers/`
   - Add new database models in `apps/backend/src/prisma/schema.prisma`

## Useful Commands Reference

### Development
```bash
npm run dev              # Start both frontend and backend
npm run dev:backend      # Start only backend
npm run dev:frontend     # Start only frontend
```

### Database
```bash
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio
```

### Docker
```bash
npm run docker:up        # Start services
npm run docker:down      # Stop services
docker ps                # List running containers
docker logs webapp-postgres  # View PostgreSQL logs
```

### Building
```bash
npm run build            # Build frontend and backend
cd apps/frontend && npm run build  # Build only frontend
cd apps/backend && npm run build   # Build only backend
```

### Prisma
```bash
cd apps/backend
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate dev  # Create and apply migration
npm run prisma:studio    # Open Prisma Studio GUI
npm run prisma:format    # Format schema file
```

## Getting Help

- **Documentation:** See README.md for detailed information
- **API Reference:** All endpoints documented in README.md
- **Issues:** Check logs in terminal for error messages
- **Database:** Use Prisma Studio to inspect data

---

**You're all set!** 🎉

Your webapp template is now running and ready for development.
