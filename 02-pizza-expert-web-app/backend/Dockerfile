# Stage 1: Build stage
FROM node:21-alpine AS builder

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY *.js .

# Stage 2: Production stage
FROM gcr.io/distroless/nodejs20-debian12

# Create non-root user (in distroless, user with ID 1000 is nonroot)
USER nonroot:nonroot

WORKDIR /usr/src/app

# Copy built application from builder stage
COPY --from=builder --chown=nonroot:nonroot /usr/src/app .

EXPOSE 5050

# Command to run the application
CMD ["server.js"]
