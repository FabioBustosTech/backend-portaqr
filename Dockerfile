# Etapa de construcción
FROM node:20-alpine AS builder

# Instalar dependencias necesarias para bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias para desarrollo
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar la aplicación
RUN npm run build

# Etapa de desarrollo
FROM node:20-alpine AS development

# Instalar dependencias necesarias
RUN apk add --no-cache python3 make g++
# SPEC-005: Ghostscript para sanitización de PDFs (PdfSanitizerService)
RUN apk add --no-cache ghostscript

WORKDIR /app

COPY package*.json ./

# Instalar todas las dependencias incluyendo las de desarrollo
RUN npm install

# Copiar el código fuente
COPY . .

# Comando para desarrollo con hot-reload
CMD ["npm", "run", "dev"]

# Etapa de producción
FROM node:20-alpine AS production

# Instalar dependencias necesarias para producción
RUN apk add --no-cache python3 make g++
# SPEC-005: Ghostscript para sanitización de PDFs (PdfSanitizerService)
RUN apk add --no-cache ghostscript

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --only=production

# Copiar archivos compilados desde la etapa de construcción
COPY --from=builder /app/dist ./dist

# Exponer el puerto de la aplicación
EXPOSE 3001

# Comando para iniciar la aplicación
CMD ["node", "dist/main.js"]