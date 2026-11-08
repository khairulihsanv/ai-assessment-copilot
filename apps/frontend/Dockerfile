# Dexa Assessment frontend (Next.js BFF). Build context: the repository root.
#   docker build -f apps/frontend/Dockerfile .
FROM node:22-bookworm-slim AS deps
WORKDIR /repo
# Workspace manifests first, so dependency install is cached until a manifest changes.
COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/
COPY apps/backend/package.json apps/backend/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY tsconfig.json biome.json ./
COPY packages/contracts packages/contracts
COPY apps/frontend apps/frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w packages/contracts && npm run build -w apps/frontend

FROM node:22-bookworm-slim AS run
WORKDIR /repo
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
COPY --from=build /repo/package.json ./
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/contracts ./packages/contracts
COPY --from=build /repo/apps/frontend ./apps/frontend
WORKDIR /repo/apps/frontend
EXPOSE 3000
CMD ["sh", "-c", "npx next start -p ${PORT}"]
