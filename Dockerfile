# syntax=docker/dockerfile:1.7

############################
# Build stage (Debian, not Alpine)
############################
FROM --platform=$BUILDPLATFORM node:20-bookworm-slim AS builder
WORKDIR /app

# Install only what's needed for build; add git if your deps use it
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

# Leverage caching: install deps first
COPY package.json package-lock.json ./
# Use npm ci for reproducibility; legacy-peer-deps only if your tree needs it
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

# Now copy source and build
COPY . .
# IMPORTANT: don't set NODE_ENV=production here; you need devDeps to build
RUN npm run build

############################
# Runtime stage (tiny Nginx)
############################
FROM nginx:alpine AS runtime
# If your nginx.conf listens on 80 (most do), expose 80, not 3000
EXPOSE 80
# Healthcheck (optional but handy)
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://127.0.0.1/ || exit 1

# Copy static build
COPY --from=builder /app/build /usr/share/nginx/html
# Your custom server config
COPY nginx.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]