FROM oven/bun:1-alpine
WORKDIR /app
# Build context must be the repo root so the lockfile is available.
# Deploy with: fly deploy -c packages/api/fly.toml from repo root
COPY packages/api/package.json ./
COPY bun.lock ./
RUN bun install --production --frozen-lockfile
COPY packages/api/src/ src/
COPY packages/api/config.ts ./
EXPOSE 8080
ENV HOST=0.0.0.0
ENV PORT=8080
CMD ["bun", "run", "src/index.ts"]
