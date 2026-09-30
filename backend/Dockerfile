FROM node:24-alpine

WORKDIR /app

# Install production dependencies only, using the lockfile for reproducibility.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application source.
COPY . .

EXPOSE 3000

# Start the server.
CMD ["npm", "start"]

