FROM oven/bun:1 as base
WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000
CMD ["/app/entrypoint.sh"]
