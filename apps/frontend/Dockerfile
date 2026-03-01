# =============================================================================
# Frontend Dockerfile — Multi-stage build
# Build context: project root (webapp_template/)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies and build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json tsconfig.json ./

# Copy workspace package.json files
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/

# Install all dependencies
RUN npm ci --workspace=apps/frontend --workspace=packages/shared

# Copy shared package source and build it
COPY packages/shared/ packages/shared/
RUN npm run build --workspace=packages/shared

# Copy frontend source
COPY apps/frontend/ apps/frontend/

# Build frontend (Vite produces static files in apps/frontend/dist)
ARG VITE_API_URL=/api
ARG VITE_APP_NAME="Your App Name"
ARG VITE_ENABLE_ORGANIZATIONS=true

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_ENABLE_ORGANIZATIONS=${VITE_ENABLE_ORGANIZATIONS}

RUN npm run build --workspace=apps/frontend

# ---------------------------------------------------------------------------
# Stage 2: Serve with nginx
# ---------------------------------------------------------------------------
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built static files from build stage
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
