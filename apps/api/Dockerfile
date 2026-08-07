# Build context is the repo root (npm workspaces monorepo):
#   docker build -f apps/api/Dockerfile -t <tag> .
FROM node:22-slim

WORKDIR /app

# Copy every workspace's package.json first (npm ci needs the full workspace
# set to match the root lockfile) but only api/db/ai/shared source is copied
# below — apps/web's source isn't needed to run the API.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ai/package.json packages/ai/package.json

RUN npm ci

COPY apps/api apps/api
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY packages/ai packages/ai

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "run", "start", "-w", "apps/api"]
