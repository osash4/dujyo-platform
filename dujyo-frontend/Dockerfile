FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY public ./public
COPY tsconfig.json ./

# Expose port
EXPOSE 5173

# Start the development server
CMD ["npm", "start"]
