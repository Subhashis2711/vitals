# Build context is the monorepo root.
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mcp/package.json apps/mcp/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ai/package.json packages/ai/package.json

RUN npm ci

COPY apps/mcp apps/mcp
COPY packages/shared packages/shared
COPY packages/db packages/db

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
EXPOSE 8080

CMD ["npm", "run", "start", "-w", "apps/mcp"]
