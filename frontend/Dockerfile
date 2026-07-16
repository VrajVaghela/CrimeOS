# ==============================================================================
# Video Incident Analyzer — Frontend Dockerfile
# ==============================================================================
# Vite dev server for React + TypeScript frontend.
# ==============================================================================

FROM node:20-alpine

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server accessible from Docker network
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
