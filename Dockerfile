# Multi-stage: build the static bundle with Node, then serve it with nginx.
# The final image carries only the built assets and nginx, no node_modules.

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS serve
# SPA config and built assets.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Write config.js from environment at container start (env stays out of the
# build). The official nginx image runs scripts in this directory on boot.
COPY docker/entrypoint.sh /docker-entrypoint.d/40-write-config.sh
RUN chmod +x /docker-entrypoint.d/40-write-config.sh
EXPOSE 80
