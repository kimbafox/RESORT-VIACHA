# syntax=docker/dockerfile:1

# ---------- Etapa 1: dependencias de producción ----------
FROM node:22-trixie-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Etapa 2: imagen final ----------
FROM node:22-trixie-slim AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/resort.sqlite

WORKDIR /app

# /data guarda la base SQLite fuera del código (se monta como volumen)
RUN mkdir -p /data && chown node:node /data && chmod 700 /data

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node BACKEND ./BACKEND
COPY --chown=node:node FRONTEND ./FRONTEND

# No se ejecuta como root
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "BACKEND/server.js"]
