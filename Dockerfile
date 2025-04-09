# Stage 1: Build the application
FROM node:23.7.0-alpine3.21 AS builder
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install -f

# Copy TypeScript configuration explicitly
COPY tsconfig*.json ./

# Copy the entire project, including `src/`
COPY . .

# Debugging: Check if `src/` exists inside the container
RUN ls -lah src

# Debugging: Check if `hls/` exists and create it if missing
RUN if [ ! -d "hls" ]; then \
    echo "hls directory not found. Creating it..."; \
    mkdir -p hls; \
    fi

# Debugging: Verify that `hls/` was created
RUN ls -lah hls

# Build the NestJS application (compiles `src/` into `dist/`)
RUN npm run build

#Remove node_modules
RUN rm -rf node_modules

#only prod dependencies
RUN npm ci --only=prod -f

# Debugging: Check if `dist/` was created
RUN ls -lah dist

# Stage 2: Create the minimal production image
FROM node:23.7.0-alpine3.21
WORKDIR /usr/src/app

# Install FFmpeg for RTSP stream processing
RUN apk add --no-cache ffmpeg

# Copy only necessary files from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/hls ./hls
COPY --from=builder /usr/src/app/public ./public


# Expose the application port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
