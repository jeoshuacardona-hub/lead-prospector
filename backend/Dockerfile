FROM node:20-slim

ENV NODE_ENV=production

WORKDIR /app

# Copy backend package files and install production dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Copy frontend package files, install dependencies, and compile it
COPY frontend/package*.json /app/frontend/
WORKDIR /app/frontend
RUN npm install
COPY frontend/ ./
RUN npm run build

# Copy remaining backend source files
WORKDIR /app/backend
COPY backend/ ./

# Expose backend port
EXPOSE 3001

CMD [ "npm", "start" ]
