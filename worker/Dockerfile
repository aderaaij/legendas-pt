# Legendas-PT worker (data plane). Outbound-only, no exposed ports.
# Build context is the repo root: `docker build -f worker/Dockerfile .`
FROM node:20-slim

WORKDIR /app

# Install dependencies (incl. devDeps for tsx, which runs the TS worker directly).
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# The worker imports the shared libraries under src/ via the @/* path alias,
# which tsx resolves from tsconfig.json.
COPY tsconfig.json ./
COPY src ./src
COPY worker ./worker

ENV NODE_ENV=production

# No EXPOSE: the worker makes only outbound connections (Supabase, RTP, LLM API).
# Invoke the tsx binary directly (no npx layer) so SIGTERM from `docker stop`
# reaches the process for graceful shutdown. Compose sets `init: true` (tini) as
# PID 1 to forward signals and reap.
CMD ["node_modules/.bin/tsx", "worker/index.ts"]
