FROM node:24.4.0-alpine3.22 AS base

# Install system dependencies required for React Native/Expo
RUN apk add --no-cache git

# Development dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Production dependencies stage
FROM base AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
# Build for web production
RUN npx expo export

# Production stage
FROM nginx:alpine AS production
# Copy the built web app to nginx serve directory
COPY --from=build /app/dist /usr/share/nginx/html
# Copy a custom nginx config if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]