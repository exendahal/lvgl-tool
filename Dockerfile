# ---- deps: install once, reused by both the dev and build stages ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- dev: hot-reloading Vite dev server, source mounted in via docker-compose ----
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---- build: produces the static dist/ bundle ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- prod: the built bundle served by nginx, for previewing a production build locally ----
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
