FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN ls -l node_modules/.bin && npx vite --version
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host"] 