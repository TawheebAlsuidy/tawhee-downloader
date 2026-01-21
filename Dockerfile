FROM node:20-slim

# Install system dependencies required for yt-dlp and ffmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp binary directly
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Create temp dir
RUN mkdir -p temp_downloads

# Expose port (Render sets PORT env var automatically, default 8081 locally)
EXPOSE 8081

# Start server
CMD ["node", "server.js"]
