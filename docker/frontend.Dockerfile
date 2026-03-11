# ---- Stage 1: Build Frontend ----
FROM node:22-alpine AS builder

WORKDIR /app/frontend

# Copy dependencies first
COPY frontend/package.json frontend/yarn.lock ./
# Ignore scripts to prevent husky install issue during docker build without git
RUN yarn install --frozen-lockfile --ignore-scripts

# Copy source code and build
COPY frontend/ ./
RUN yarn build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Copy NGINX configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled dist from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
