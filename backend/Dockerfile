# syntax=docker/dockerfile:1

# ---- Build ----
# Solo compila: acá se instalan también las devDependencies (TypeScript, el CLI
# de Nest), que no tienen por qué viajar a la imagen final.
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime ----
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Las subidas (adjuntos de mensajes y fotos de perfil) van a un volumen — ver
# docker-compose.yml. La carpeta se crea acá, ya con el dueño correcto, porque
# Docker copia el dueño de este directorio al inicializar el volumen: si no
# existiera, el volumen nacería root y el proceso (que corre como `node`) no
# podría escribir en él.
RUN mkdir -p uploads/avatars && chown -R node:node uploads

# El proceso no necesita root para nada: si alguien llegara a ejecutar código
# vía una subida, lo hace con un usuario sin privilegios.
USER node

EXPOSE 3000

# Es lo que `depends_on: condition: service_healthy` puede esperar si mañana
# algo se encadena a este servicio, y hace visible en `docker ps` si la app
# quedó arriba pero sin responder (por ejemplo, sin poder conectar a Mongo).
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
