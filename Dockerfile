# ==============================================================================
# Multi-Stage Dockerfile for Floework Modular Monolith API
# Deployed to Amazon ECS Fargate behind Application Load Balancer
# Non-root execution, minimal Alpine base, native HEALTHCHECK probe
# ==============================================================================

# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

RUN npm ci

COPY . .

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install curl for container health check
RUN apk add --no-cache curl

# Create non-root application user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 floework

# Copy dependencies and application source
COPY --from=builder --chown=floework:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=floework:nodejs /app/api ./api
COPY --from=builder --chown=floework:nodejs /app/package.json ./package.json
COPY --from=builder --chown=floework:nodejs /app/tsconfig.json* ./

USER floework

EXPOSE 3000

# Health check probe aligned with ALB target group configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start modular monolith API server
CMD ["node", "-r", "ts-node/register/transpile-only", "api/server.ts"]
