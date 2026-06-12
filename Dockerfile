FROM oven/bun:1.2 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
COPY packages/types/package.json packages/types/
COPY packages/core/package.json packages/core/
COPY packages/sdk/package.json packages/sdk/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN bun install --frozen-lockfile || bun install

# Copy all source
COPY . .

# Build frontend (output goes to packages/client/dist/)
RUN bun run build

# --- Production stage ---
FROM oven/bun:1.2-slim
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/package.json ./

# Server serves built frontend + API
ENV NODE_ENV=production
ENV PORT=3001
ENV STATIC_DIR=/app/packages/client/dist
EXPOSE 3001

# Run db:push (migrations) then start server
CMD ["sh", "-c", "cd packages/server && bun drizzle-kit push && cd /app && bun run server"]
