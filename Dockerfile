# Stage 1: Build the NestJS application
FROM node:16-alpine as builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production -f

# Copy the full application and build it
COPY . .
RUN npm run build
RUN mkdir -p /app/hls

# Stage 2: Use jrottenberg/ffmpeg for H.265 (HEVC) support
FROM jrottenberg/ffmpeg:4.4-ubuntu as ffmpeg

# Install Node.js 

WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/hls ./hls
  
# Expose the port used by the NestJS app
EXPOSE 3000

# Start the NestJS app
CMD ["node", "dist/main.js"]
