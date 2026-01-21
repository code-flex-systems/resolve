# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Native build tooling for any node-gyp modules during npm ci
RUN apk add --no-cache python3 make g++ postgresql-dev

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

RUN npm ci

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time public env var (safe to bake into client bundle)
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

RUN echo "=== /app/apps/web ===" && ls -la /app/apps/web && \
    echo "=== /app/apps/web/.next ===" && ls -la /app/apps/web/.next || true && \
    echo "=== find standalone ===" && find /app -maxdepth 5 -type d -name standalone -print

# Build Next.js (will produce standalone output)
RUN npm --workspace apps/web run build

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Non-root user
RUN addgroup -S app && adduser -S app -G app

# Copy standalone server + minimal node_modules produced by Next
# Standalone output includes a server.js and required node_modules.
COPY --from=builder /app/apps/web/.next/standalone ./

# Copy static assets (must be in the expected path)
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

USER app
EXPOSE 8080

CMD ["node", "apps/web/server.js"]
