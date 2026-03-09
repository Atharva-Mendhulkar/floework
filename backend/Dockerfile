# Base image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client and build TypeScript
RUN npm run db:generate
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built app
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5001

# Start the server
CMD ["npm", "start"]
