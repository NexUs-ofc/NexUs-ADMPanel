# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Public browser configuration only: Vite embeds these values in the bundle.
ARG VITE_AUTH_API_URL
ARG VITE_CORE_API_URL
ARG VITE_NOTIFY_API_URL
ARG VITE_IA_API_URL
ARG VITE_BI_IA_API_URL
ARG VITE_ADMIN_KEY_SHA256
ARG VITE_DEMO_MODE
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist /usr/share/nginx/html
EXPOSE 8080
USER 101:101
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
