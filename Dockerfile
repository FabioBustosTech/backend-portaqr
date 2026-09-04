# Etapa de construcción
FROM node:24.20-alpine AS builder

# Instalar dependencias necesarias para bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos de dependencias (SPEC-033: pnpm — incluye pnpm-workspace.yaml
# con allowBuilds/overrides; sin él pnpm falla con ERR_PNPM_IGNORED_BUILDS)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalar todas las dependencias para desarrollo
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate && pnpm install --frozen-lockfile

# Copiar el resto del código
COPY . .

# Compilar la aplicación
RUN pnpm build

# Etapa de desarrollo
FROM node:24.20-alpine AS development

# Instalar dependencias necesarias
RUN apk add --no-cache python3 make g++
# SPEC-005: Ghostscript para sanitización de PDFs (PdfSanitizerService)
RUN apk add --no-cache ghostscript

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalar todas las dependencias incluyendo las de desarrollo
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate && pnpm install --frozen-lockfile

# Copiar el código fuente
COPY . .

# Comando para desarrollo con hot-reload
CMD ["pnpm", "dev"]

# Etapa de producción
FROM node:24.20-alpine AS production

# Instalar dependencias necesarias para producción
RUN apk add --no-cache python3 make g++
# SPEC-005: Ghostscript para sanitización de PDFs (PdfSanitizerService)
RUN apk add --no-cache ghostscript

WORKDIR /app

# Copiar archivos de dependencias (SPEC-033: pnpm)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Instalar solo dependencias de producción
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate && pnpm install --frozen-lockfile --prod

# Copiar archivos compilados desde la etapa de construcción
COPY --from=builder /app/dist ./dist

# Exponer el puerto de la aplicación
EXPOSE 3004

# Comando para iniciar la aplicación
CMD ["node", "dist/main.js"]
