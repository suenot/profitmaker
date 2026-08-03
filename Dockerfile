FROM oven/bun:1.3 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
COPY packages/types/package.json packages/types/
COPY packages/sdk/package.json packages/sdk/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
COPY packages/cli/package.json packages/cli/
COPY packages/mcp/package.json packages/mcp/
COPY templates/module-template/package.json templates/module-template/
RUN bun install --frozen-lockfile

# Copy all source
COPY . .

# Build frontend (output goes to packages/client/dist/)
RUN bun run build

# --- Production stage ---
FROM oven/bun:1.3-slim
WORKDIR /app

# oven/bun ships a non-root `bun` user (uid 1000) — own the tree so the server
# can run as it. .modules is a mount point for installed modules; pre-creating
# it owned by bun means a freshly created named volume inherits that ownership.
COPY --from=base --chown=bun:bun /app/node_modules ./node_modules
COPY --from=base --chown=bun:bun /app/packages ./packages
COPY --from=base --chown=bun:bun /app/package.json ./
RUN mkdir -p /app/packages/server/.modules && chown -R bun:bun /app/packages/server/.modules

# Server serves built frontend + API
ENV NODE_ENV=production
ENV PORT=3001
ENV STATIC_DIR=/app/packages/client/dist
EXPOSE 3001

USER bun

# /health is auth-exempt (see src/index.ts). Uses bun rather than curl, which
# the slim image does not ship.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD bun -e "try { const r = await fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health'); process.exit(r.ok ? 0 : 1) } catch { process.exit(1) }"

# Apply committed migrations, then start. `migrate` replays reviewed migration
# files; the previous `push` auto-diffed the schema against the live prod DB on
# every boot and could drop columns. Fails closed — if migrations do not apply,
# the chain stops and the server never serves a half-migrated schema.
CMD ["sh", "-c", "cd packages/server && bun drizzle-kit migrate && cd /app && bun run server"]
