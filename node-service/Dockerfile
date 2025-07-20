FROM node:20-alpine

# Install necessary packages
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Verify the build
RUN ls -la dist/
RUN node -e "console.log('Node.js version:', process.version)"

EXPOSE 3001

# Use a more robust startup command
CMD ["node", "dist/index.js"] 