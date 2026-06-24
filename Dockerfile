FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --omit=dev

COPY . .

RUN mkdir -p /data

ENV DATABASE_PATH=/data/memebot.sqlite

CMD ["node", "src/index.js"]
