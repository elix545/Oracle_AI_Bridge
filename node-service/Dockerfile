FROM node:20-slim

# Install Oracle Instant Client and other dependencies
RUN apt-get update && apt-get install -y \
    libaio1 \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Create Oracle directory and download Oracle Instant Client
RUN mkdir -p /opt/oracle \
    && wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip \
    && unzip instantclient-basiclite-linuxx64.zip \
    && rm instantclient-basiclite-linuxx64.zip \
    && mv instantclient_* /opt/oracle/instantclient \
    && echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig

# Set Oracle environment variables
ENV ORACLE_HOME=/opt/oracle/instantclient
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient:$LD_LIBRARY_PATH

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