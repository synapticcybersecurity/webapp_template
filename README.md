# WebApp Template

A production-ready, full-stack web application template built with modern technologies and best practices. This template provides authentication, user management, multi-tenant organization support, and a complete admin dashboard out of the box.

## Features

- **Authentication & Authorization**
  - Email/password authentication with email verification
  - Session-based auth with secure cookies
  - Role-based access control (User, Admin)
  - OAuth providers ready (GitHub, Google) - commented out for easy enabling

- **Multi-Tenant Organizations**
  - Organization creation and management
  - Team member invitations
  - Role-based permissions (Owner, Admin, Member)

- **User Management**
  - User profiles with avatar support
  - Admin dashboard for user management
  - Ban/unban users
  - Role management

- **Modern Tech Stack**
  - TypeScript throughout
  - React 18 with Vite
  - Express.js backend
  - PostgreSQL with Prisma ORM
  - Better Auth for authentication
  - shadcn/ui components with Tailwind CSS

- **Developer Experience**
  - Monorepo structure with npm workspaces
  - Docker Compose for local development
  - Hot reload for frontend and backend
  - Shared types and validation schemas
  - Comprehensive error handling

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Axios** - HTTP client
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Utility-first CSS

### Backend
- **Node.js 20** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM and database toolkit
- **Better Auth** - Authentication library
- **Postmark** - Email service

### Database & Infrastructure
- **PostgreSQL 16** - Primary database
- **Redis 7** - Caching and sessions
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd webapp_template
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example environment files and update them with your values:

   ```bash
   # Root environment
   cp .env.example .env

   # Backend environment
   cp apps/backend/.env.example apps/backend/.env

   # Frontend environment
   cp apps/frontend/.env.example apps/frontend/.env
   ```

4. **Start Docker services**
   ```bash
   npm run docker:up
   ```

   This starts PostgreSQL, Redis, and pgAdmin.

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Seed the database with test data**
   ```bash
   npm run db:seed
   ```

7. **Start the development servers**
   ```bash
   npm run dev
   ```

   This starts both frontend (http://localhost:5173) and backend (http://localhost:3001).

## Test Credentials

After seeding the database, you can log in with these test accounts:

### Admin Account
- **Email:** admin@example.com
- **Password:** Admin123!
- **Role:** Admin (full system access)

### Regular Users
- **Email:** user1@example.com
- **Password:** User123!
- **Role:** User

- **Email:** user2@example.com
- **Password:** User123!
- **Role:** User

## Project Structure

```
webapp_template/
├── apps/
│   ├── backend/               # Express.js API server
│   │   ├── src/
│   │   │   ├── config/       # Configuration files (auth, email, db)
│   │   │   ├── controllers/  # Route controllers
│   │   │   ├── middleware/   # Express middleware
│   │   │   ├── routes/       # API routes
│   │   │   ├── prisma/       # Database schema and migrations
│   │   │   └── index.ts      # Server entry point
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── frontend/              # React application
│       ├── src/
│       │   ├── components/   # Reusable components
│       │   │   ├── ui/       # shadcn/ui components
│       │   │   ├── auth/     # Auth-related components
│       │   │   └── layout/   # Layout components
│       │   ├── hooks/        # Custom React hooks
│       │   ├── lib/          # Utilities and API client
│       │   ├── pages/        # Page components
│       │   │   ├── auth/     # Authentication pages
│       │   │   ├── dashboard/# Dashboard pages
│       │   │   ├── organization/ # Organization pages
│       │   │   └── admin/    # Admin pages
│       │   ├── styles/       # Global styles
│       │   ├── App.tsx       # Root component with routes
│       │   └── main.tsx      # Entry point
│       ├── .env.example
│       └── package.json
│
├── packages/
│   └── shared/               # Shared code between frontend and backend
│       ├── src/
│       │   ├── types/        # TypeScript type definitions
│       │   └── validation/   # Zod validation schemas
│       └── package.json
│
├── docker/
│   └── docker-compose.yml    # Docker services configuration
│
├── package.json              # Root package.json with workspaces
└── README.md
```

## Available Scripts

### Root Level

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:backend` - Start only the backend server
- `npm run dev:frontend` - Start only the frontend dev server
- `npm run build` - Build both frontend and backend for production
- `npm run docker:up` - Start Docker services (PostgreSQL, Redis, pgAdmin)
- `npm run docker:down` - Stop Docker services
- `npm run db:migrate` - Run Prisma database migrations
- `npm run db:seed` - Seed database with test data
- `npm run db:studio` - Open Prisma Studio (database GUI)

### Backend

- `npm run dev` - Start backend with hot reload
- `npm run build` - Build backend for production
- `npm run start` - Start production build
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed database

### Frontend

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Redis
REDIS_URL="redis://localhost:6379"

# Server
PORT=3001
NODE_ENV=development

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="http://localhost:3001"

# Email (Postmark)
POSTMARK_API_KEY="your-postmark-api-key"
FROM_EMAIL="noreply@yourdomain.com"
FROM_NAME="Your App Name"

# Frontend URL (for CORS and email links)
FRONTEND_URL="http://localhost:5173"

# OAuth (optional - uncomment to enable)
# GITHUB_CLIENT_ID="your-github-client-id"
# GITHUB_CLIENT_SECRET="your-github-client-secret"
# GOOGLE_CLIENT_ID="your-google-client-id"
# GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Frontend (.env)

```bash
# API URL
VITE_API_URL="http://localhost:3001"

# Feature Flags
VITE_ENABLE_ORGANIZATIONS=true
```

## Docker Services

The template includes Docker Compose configuration for local development:

### PostgreSQL
- **Port:** 5432
- **Database:** webapp_db
- **User:** webapp_user
- **Password:** Set in docker/.env

### Redis
- **Port:** 6379
- Used for session storage and caching

### pgAdmin
- **Port:** 5050
- **URL:** http://localhost:5050
- Web-based PostgreSQL admin interface

## API Endpoints

### Authentication
- `POST /api/auth/sign-up/email` - Register with email/password
- `POST /api/auth/sign-in/email` - Sign in with email/password
- `POST /api/auth/sign-out` - Sign out
- `POST /api/auth/forgot-password` - Request password reset
- `GET /api/auth/verify-email` - Verify email address
- `GET /api/auth/session` - Get current session

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update current user profile
- `GET /api/users` - List all users (admin only)
- `POST /api/users/:id/ban` - Ban user (admin only)
- `POST /api/users/:id/unban` - Unban user (admin only)
- `PATCH /api/users/:id/role` - Update user role (admin only)

### Organizations
- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization details
- `PATCH /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization
- `POST /api/organizations/:id/members` - Invite member
- `DELETE /api/organizations/:id/members/:memberId` - Remove member
- `PATCH /api/organizations/:id/members/:memberId` - Update member role

## Authentication Flow

1. **Sign Up:**
   - User registers with email/password
   - Verification email sent
   - User clicks verification link
   - Account activated

2. **Sign In:**
   - User enters email/password
   - Session created with secure cookie
   - Redirected to dashboard

3. **Protected Routes:**
   - Frontend checks authentication status
   - Redirects to login if not authenticated
   - Admin routes check for admin role

## Database Schema

### Core Tables

- **user** - User accounts and authentication
- **session** - User sessions
- **account** - OAuth accounts (if enabled)
- **verification** - Email verification tokens
- **organization** - Organizations/teams
- **organizationMember** - Organization memberships
- **organizationInvitation** - Pending invitations

### Example Domain Tables

- **project** - Example projects
- **task** - Example tasks

## Customization

### Adding New Pages

1. Create page component in `apps/frontend/src/pages/`
2. Add route in `apps/frontend/src/App.tsx`
3. Add navigation link in `apps/frontend/src/components/layout/Header.tsx`

### Adding New API Endpoints

1. Create controller in `apps/backend/src/controllers/`
2. Create route in `apps/backend/src/routes/`
3. Register route in `apps/backend/src/index.ts`

### Adding New UI Components

```bash
# Add shadcn/ui components
npx shadcn-ui@latest add [component-name]
```

### Enabling OAuth Providers

1. Uncomment OAuth configuration in `apps/backend/src/config/auth.config.ts`
2. Add OAuth credentials to `apps/backend/.env`
3. Update Prisma schema if needed
4. Run migrations: `npm run db:migrate`

## Security Best Practices

- All passwords hashed with bcrypt
- Secure HTTP-only cookies for sessions
- CSRF protection enabled
- Rate limiting on auth endpoints
- Input validation with Zod schemas
- SQL injection protection via Prisma
- XSS protection with helmet
- CORS properly configured

## Email Configuration

The template uses Postmark for transactional emails:

1. Sign up at https://postmarkapp.com
2. Get your Server API Token
3. Add to `apps/backend/.env`:
   ```bash
   POSTMARK_API_KEY="your-token"
   FROM_EMAIL="noreply@yourdomain.com"
   FROM_NAME="Your App Name"
   ```

Emails sent:
- Email verification
- Password reset
- Organization invitations

## Deployment

### Backend

1. Build the application:
   ```bash
   cd apps/backend
   npm run build
   ```

2. Set production environment variables

3. Run migrations:
   ```bash
   npm run prisma:migrate deploy
   ```

4. Start the server:
   ```bash
   npm start
   ```

### Frontend

1. Build the application:
   ```bash
   cd apps/frontend
   npm run build
   ```

2. Serve the `dist` folder with any static hosting service (Vercel, Netlify, etc.)

### Database

- Use managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
- Update `DATABASE_URL` in production environment

### Recommended Platforms

- **Frontend:** Vercel, Netlify, Cloudflare Pages
- **Backend:** Railway, Render, Fly.io, AWS
- **Database:** Supabase, Railway, Render

## Troubleshooting

### Port Already in Use

If you see "Port 3001 already in use":
```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9
```

### Database Connection Issues

1. Ensure Docker services are running:
   ```bash
   npm run docker:up
   ```

2. Check connection string in `apps/backend/.env`

3. Verify PostgreSQL is accepting connections:
   ```bash
   docker ps
   ```

### Email Not Sending

1. Verify Postmark API key is correct
2. Check `FROM_EMAIL` is verified in Postmark
3. Review backend logs for email errors

### Build Errors

1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules apps/*/node_modules packages/*/node_modules
   npm install
   ```

2. Clear build caches:
   ```bash
   npm run clean
   npm run build
   ```

## Contributing

This is a template repository. Fork it and customize it for your needs!

## License

MIT

## Support

For issues and questions, please open an issue on the repository.

---

**Built with ❤️ using modern web technologies**
