# Stage 1: Build stage
FROM node:21-alpine AS builder

WORKDIR /usr/src/app
COPY package*.json ./
#RUN npm ci --only=production
RUN npm install
#COPY . .
COPY server.js .
COPY techfusion.xml .

# Stage 2: Production stage
FROM gcr.io/distroless/nodejs20-debian12

# Create non-root user (in distroless, user with ID 1000 is nonroot)
USER nonroot:nonroot

WORKDIR /usr/src/app

# Copy built application from builder stage
COPY --from=builder --chown=nonroot:nonroot /usr/src/app .

#EXPOSE 5000

# Command to run the application
CMD ["server.js"]
