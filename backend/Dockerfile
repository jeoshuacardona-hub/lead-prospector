FROM node:20-slim

# Install Google Chrome Stable and dependencies for Puppeteer
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 libasound2 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configure Puppeteer to use the installed Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    NODE_ENV=production

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend production dependencies
WORKDIR /app/backend
RUN npm ci --only=production

# Copy remaining source code
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Expose backend port
WORKDIR /app/backend
EXPOSE 3001

CMD [ "npm", "start" ]
