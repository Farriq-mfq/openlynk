# ---> builder: install workspace deps (bun.lock) and build the Nuxt app <---
FROM oven/bun:1.3 AS build
WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile

COPY apps/web apps/web
COPY packages/shared packages/shared

# Baked into the client bundle; override per deploy (compose passes build args).
ARG NUXT_PUBLIC_API_BASE=http://localhost:3001
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
RUN bun --filter @openlynk/web build

# ---> runner: node serves the Nitro output; bun is not needed at runtime <---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

COPY --from=build /app/apps/web/.output ./.output
# Nitro emits its own server package.json: install exactly those prod deps.
RUN cd .output/server && npm install --omit=dev --no-audit --no-fund

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
