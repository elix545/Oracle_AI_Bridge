FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bash

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm ci --include=dev

# Copy source code
COPY . .

# Ensure vite is available in PATH
ENV PATH="/app/node_modules/.bin:$PATH"

# Fix vite binary line endings and make it executable
RUN ls -la node_modules/.bin/ && \
    echo "Vite binary found at:" && \
    ls -la node_modules/.bin/vite && \
    sed -i 's/\r$//' node_modules/.bin/vite && \
    chmod +x node_modules/.bin/vite && \
    echo "Testing vite execution:" && \
    node_modules/.bin/vite --version

EXPOSE 5173

# Start development server using npm script which should work
CMD ["npm", "run", "dev"] 