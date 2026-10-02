# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the frontend (Vite uses environment variables prefixed with VITE_)
# When building for production, these can be passed as build args
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build

# Stage 2: Serve the application via Nginx
FROM nginx:alpine

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add a custom nginx configuration to support SPA routing (React Router)
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Render passes PORT dynamically, Nginx needs to listen on it
# We'll use a small startup script to substitute the PORT variable
CMD sed -i -e 's/listen 80;/listen '"${PORT:-80}"';/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
