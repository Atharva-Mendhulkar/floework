# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the React application
RUN npm run build

# Production stage (Nginx)
FROM nginx:alpine

# Copy the built assets to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default Nginx configuration to support SPA routing
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
