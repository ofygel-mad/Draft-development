FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY apps/web/package.json apps/web/pnpm-lock.yaml ./apps/web/

RUN pnpm --dir apps/web install --frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE 4173

CMD ["pnpm", "run", "start"]
