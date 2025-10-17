FROM node:20-alpine

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++ postgresql-dev

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port 8080
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production

# Start the application with PORT explicitly set
CMD PORT=8080 npm --workspace apps/web run start
