# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Vite frontend and bundle the server
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variable to production
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy build output from the builder stage
COPY --from=builder /app/dist ./dist

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Start the server using node directly for better container lifecycle management
CMD ["node", "dist/server.cjs"]
