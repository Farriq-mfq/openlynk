# ---> builder: install workspace deps (bun.lock) and compile the api <---
FROM oven/bun:1.3 AS build
WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile

COPY apps/api apps/api
COPY packages/shared packages/shared
RUN bun --filter @openlynk/api build

# ---> runner: migrate on boot, then serve from dist <---
FROM oven/bun:1.3-slim AS runner
WORKDIR /app/apps/api
ENV NODE_ENV=production

# Workspace layout must mirror the builder (bun symlinks are absolute paths).
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/drizzle.config.ts /app/apps/api/drizzle.config.ts
COPY --from=build /app/apps/api/src /app/apps/api/src
COPY --from=build /app/packages/shared /app/packages/shared
COPY apps/api/docker-entrypoint.sh /app/apps/api/docker-entrypoint.sh
RUN chmod +x /app/apps/api/docker-entrypoint.sh

VOLUME ["/app/apps/api/uploads"]
EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
