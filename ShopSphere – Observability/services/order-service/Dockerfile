FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --omit=dev


FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules

COPY package.json ./

COPY server.js ./

USER node

EXPOSE 3002

CMD ["node", "server.js"]
