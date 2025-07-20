FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bash
COPY package*.json ./
RUN npm install --include=dev
COPY . .
ENV PATH="/app/node_modules/.bin:$PATH"
RUN ls -l /app/node_modules/.bin && node /app/node_modules/vite/bin/vite.js --version
# No necesitamos build para desarrollo
EXPOSE 5173
# Usar vite dev en lugar de preview para que el proxy funcione
CMD ["npm", "run", "dev", "--", "--host", "--port", "5173"] 