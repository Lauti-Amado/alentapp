FROM node:20-alpine

WORKDIR /app

# En un monorepo, es mejor copiar la estructura de paquetes primero
COPY package*.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Instalamos todo desde la raíz para que se creen los links de los workspaces
RUN npm install

# COPY packages/api/prisma ./packages/api/prisma

# Copiamos el resto
COPY . .

EXPOSE 3000

# El comando se puede sobreescribir en el compose, pero dejamos este por defecto
CMD ["npm", "run", "dev", "-w", "packages/api"]
