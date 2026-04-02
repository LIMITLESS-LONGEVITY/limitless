# To use this Dockerfile, you have to set `output: 'standalone'` in your next.config.ts file.
# Based on https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
# Adapted for pnpm (symlinked node_modules require single-stage install)

FROM node:22.17.0-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm

# ------- build stage -------
FROM base AS builder
WORKDIR /app

# Install dependencies (cached unless lockfile changes)
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Payload CMS needs DATABASE_URL at build time for schema generation.
# Render injects env vars at runtime but not during Docker build.
# Use a dummy URL for build — Payload only needs the format, not a live connection.
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ARG PAYLOAD_SECRET=build-time-secret-not-used-in-production
ARG NEXT_PUBLIC_SERVER_URL=https://paths-api.limitless-longevity.health
ENV DATABASE_URL=${DATABASE_URL}
ENV PAYLOAD_SECRET=${PAYLOAD_SECRET}
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--no-deprecation

RUN pnpm run build

# ------- production image -------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
