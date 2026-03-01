# =============================================================================
# Backend Dockerfile — Multi-stage build
# Build context: project root (webapp_template/)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./

# Copy workspace package.json files (needed for npm install resolution)
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

# Install production dependencies only
RUN npm ci --omit=dev --workspace=apps/backend --workspace=packages/shared \
    && npm cache clean --force

# ---------------------------------------------------------------------------
# Stage 2: Build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy root workspace + config files
COPY package.json package-lock.json tsconfig.json ./

# Copy workspace package.json files
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

# Install all dependencies (including dev for build tools)
RUN npm ci --workspace=apps/backend --workspace=packages/shared

# Copy shared package source and build it
COPY packages/shared/ packages/shared/
RUN npm run build --workspace=packages/shared

# Copy Prisma schema and generate client
COPY apps/backend/src/prisma/ apps/backend/src/prisma/
RUN npx --workspace=apps/backend prisma generate

# Copy backend source and build
COPY apps/backend/ apps/backend/
RUN npm run build --workspace=apps/backend

# ---------------------------------------------------------------------------
# Stage 3: Production image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S appgroup \
    && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy built application from build stage
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/backend/node_modules/.prisma ./apps/backend/node_modules/.prisma

# Copy package.json files (needed for module resolution)
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Copy Prisma schema (needed for migrations in production)
COPY apps/backend/src/prisma/schema.prisma ./apps/backend/src/prisma/

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Expose the backend port
EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly (PID 1)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/index.js"]
