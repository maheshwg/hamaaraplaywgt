FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

# Copy package files
COPY package.json .
COPY server.js .

# Install dependencies
RUN npm install

EXPOSE 3000

CMD ["node", "server.js"]
