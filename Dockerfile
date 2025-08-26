FROM oven/bun:latest

WORKDIR /app

COPY package.json .


RUN bun install

COPY . .

ENV NODE_ENV=production

EXPOSE 8080

CMD ["bun", "run", "start"]