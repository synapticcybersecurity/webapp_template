# =============================================================================
# Backend Dockerfile — Multi-stage build
# Build context: project root (webapp_template/)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install production dependencies
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Copy all package files (npm workspaces hoists deps to root node_modules)
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/

# Install production dependencies only
# --ignore-scripts skips husky prepare and other lifecycle scripts
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force

# ---------------------------------------------------------------------------
# Stage 2: Build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copy all package files
COPY package.json package-lock.json tsconfig.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/backend/tsconfig.json apps/backend/tsconfig.json
COPY apps/backend/tsconfig.build.json apps/backend/tsconfig.build.json
COPY packages/shared/package.json packages/shared/
COPY packages/shared/tsconfig.json packages/shared/

# Install all dependencies (including dev for build tools)
RUN npm ci --ignore-scripts

# Copy shared package source and build it
COPY packages/shared/src/ packages/shared/src/
RUN npm run build --workspace=packages/shared

# Copy Prisma schema and generate client
COPY apps/backend/src/prisma/ apps/backend/src/prisma/
RUN npx prisma generate --schema=apps/backend/src/prisma/schema.prisma

# Copy backend source and build
COPY apps/backend/src/ apps/backend/src/
RUN npm run build --workspace=apps/backend

# ---------------------------------------------------------------------------
# Stage 3: Production image
# ---------------------------------------------------------------------------
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S appgroup \
    && adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy production node_modules from deps stage (hoisted to root)
COPY --from=deps /app/node_modules ./node_modules

# Copy built application from build stage
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# Copy generated Prisma client from build stage
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy package.json files (needed for module resolution)
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Copy Prisma schema (needed for migrations in production)
COPY apps/backend/src/prisma/schema.prisma ./apps/backend/src/prisma/

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly (PID 1)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/index.js"]
