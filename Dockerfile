## ---------------------------------------------------------------------------
## Stage 1: Build
## ---------------------------------------------------------------------------
FROM node:20-slim AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/

RUN pnpm build

## ---------------------------------------------------------------------------
## Stage 2: Production
## ---------------------------------------------------------------------------
FROM node:20-slim AS runner

RUN npm install -g pnpm

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist
COPY drizzle/ ./drizzle/

EXPOSE 3001

CMD ["node", "dist/index.js"]
