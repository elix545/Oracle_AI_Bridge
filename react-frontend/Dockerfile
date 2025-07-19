FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bash
COPY package*.json ./
RUN npm install --include=dev
COPY . .
ENV PATH="/app/node_modules/.bin:$PATH"
RUN ls -l /app/node_modules/.bin && bash /app/node_modules/.bin/vite --version
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host"] 