FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src
COPY simple_node.js ./
COPY tsconfig.json ./

# Expose ports
EXPOSE 8080 8081

# Start the blockchain node
CMD ["npm", "run", "dev"]
