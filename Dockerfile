# syntax=docker/dockerfile:1
# Builds the PWA and serves the static files with Nginx.
#   docker build -t monkii/web .
# In production, monkii-infra mounts its own Nginx config over nginx/default.conf
# (TLS + /api proxied to the gateway).

FROM node:22-bookworm-slim AS build
WORKDIR /app

# Dependencies first: this layer is reused until package-lock.json changes
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm     npm ci --fetch-retries=5 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443
