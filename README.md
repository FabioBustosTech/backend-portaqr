# backend-portaqr

Monolito modular **NestJS** que unifica `bff-service` + `user-service` + `qr-service` en un único proceso (puerto **3001**), según [SPEC-001: Migración de 3 microservicios a Monolito Modular](../../docs/spec/SPEC-001-migracion-monolito-modular.md).

Elimina la duplicación de código (~40%), el borde HTTP interno con `any` (`@nestjs/axios` + `firstValueFrom`) y los 3 deploys separados, manteniendo la superficie pública del BFF como contrato con el frontend `qr-app`.

## Stack tecnológico

| Capa | Tecnología |
| ---- | ---------- |
| Framework | NestJS 10, TypeScript 5 |
| Base de datos | MongoDB (BD `sistema`) vía Mongoose 8 |
| Autenticación | JWT (access + refresh), Passport, bcrypt |
| Pagos | Webpay / Transbank (`transbank-sdk`) |
| Email | Nodemailer + plantillas EJS |
| Documentación | Swagger (`@nestjs/swagger`) |
| Healthcheck | `@nestjs/terminus` |

## Requisitos previos

- Node.js **20+**
- MongoDB (local o vía Docker Compose)
- npm 10+

## Instalación

```bash
npm install
```

## Configuración

1. Copia el archivo de ejemplo y ajusta los valores:

```bash
cp .env.example .env
```

2. Configura al menos las siguientes variables:

| Variable | Descripción | Default |
| --- | --- | --- |
| `SERVER_PORT` | Puerto del servidor | `3001` |
| `MONGODB_URI` | Cadena de conexión a MongoDB (BD `sistema`) | `mongodb://root:example@mongo:27017/sistema?authSource=admin` |
| `JWT_SECRET` | Secreto para firmar tokens de acceso | — |
| `JWT_REFRESH_SECRET` | Secreto para firmar refresh tokens | — |
| `WEBPAY_COMMERCE_CODE` | Código de comercio Webpay | — |
| `WEBPAY_API_KEY` | API key de Webpay | — |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Configuración SMTP para emails | — |

> ⚠️ **Nunca** commitees el archivo `.env`. Está excluido por `.gitignore`.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Desarrollo con hot-reload (`nest start --watch`) |
| `npm run build` | Compilación TypeScript + copia de assets (`templateEmail`) |
| `npm run start` | Inicia la app compilada |
| `npm run prod` | Ejecuta `dist/main` en producción |
| `npm run lint` | ESLint + Prettier (auto-fix) |
| `npm run format` | Formatea el código con Prettier |
| `npm run test` | Ejecuta los tests unitarios (Jest) |
| `npm run test:cov` | Tests con reporte de cobertura |
| `npm run test:e2e` | Tests end-to-end |
| `npm run create:admin` | CLI para crear un usuario administrador |

## Estructura del proyecto

```
backend-portaqr/
├── src/
│   ├── main.ts                    # Bootstrap: puerto 3001, CORS, ValidationPipe, interceptors
│   ├── app.module.ts              # Unión de todos los módulos + MongooseModule
│   ├── modules/                   # Módulos de dominio (NestJS)
│   │   ├── auth/                  # Login, refresh, profile (JWT + bcrypt)
│   │   ├── users/                 # CRUD usuarios, verificación email, reset password
│   │   ├── qr/                    # CRUD de códigos QR
│   │   ├── scan/                  # Registro y estadísticas de escaneos
│   │   ├── plan/                  # Planes de suscripción
│   │   ├── pet-tag/               # Placas para mascotas
│   │   ├── qr-activate/           # Activación de QR
│   │   ├── qr-free-generation/    # Generación gratuita de QR
│   │   ├── statistics/            # Estadísticas de usuario y sistema
│   │   ├── mail/                  # Envío de correos (contacto)
│   │   └── webpay/                # Integración de pagos Webpay
│   ├── health/                    # Healthcheck con estado de MongoDB
│   ├── common/                    # Decorators, DTOs y servicios compartidos
│   ├── middleware/                # TrackingId + RequestLogger
│   ├── interceptors/              # ResponseLogger + LegacyIdAlias
│   ├── templateEmail/             # Plantillas HTML/EJS para emails
│   └── scripts/                   # Scripts CLI (create-admin)
├── scripts/copy-assets.js         # Copia templateEmail → dist/ en el build
├── Dockerfile                     # Multi-stage (builder / development / production)
├── .env.example                   # Variables de entorno de referencia
└── package.json
```

Cada módulo de dominio sigue una estructura interna por capas:

```
modules/<modulo>/
├── application/     # DTOs y casos de uso
├── domain/          # Entidades, agregados, puertos, constantes
├── infrastructure/  # Adaptadores, repositorios MongoDB, mappers, schemas
└── presentation/    # Controladores HTTP
```

## API

Todas las rutas (excepto las marcadas como públicas) requieren `Authorization: Bearer <token>`.

### Autenticación — `/auth`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| POST | `/auth/login` | Inicia sesión y devuelve tokens | ✅ |
| POST | `/auth/refresh` | Renueva el access token | ✅ |
| GET | `/auth/profile` | Datos del usuario autenticado | ❌ |

### Usuarios — `/users`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| POST | `/users` | Crear usuario | ✅ |
| POST | `/users/:id/verify-email` | Verificar email | ✅ |
| POST | `/users/:id/resend-verification` | Reenviar código de verificación | ✅ |
| POST | `/users/forgot-password` | Solicitar reset de password | ✅ |
| POST | `/users/reset-password` | Resetear password | ✅ |
| GET | `/users/check-username/:userName` | Verificar disponibilidad de username | ✅ |
| GET | `/users/check-email/:email` | Verificar disponibilidad de email | ✅ |
| GET | `/users/search` | Buscar usuarios | ❌ |
| GET | `/users/paginated` | Listar usuarios paginado | ❌ |
| GET | `/users` | Listar usuarios | ❌ |
| GET | `/users/:id` | Obtener usuario por ID | ❌ |
| PATCH | `/users/:id/change-password` | Cambiar password | ❌ |
| PATCH | `/users/:id` | Actualizar usuario | ❌ |
| DELETE | `/users/:id` | Eliminar usuario | ❌ |

### QR — `/qr`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| POST | `/qr` | Crear QR | ❌ |
| GET | `/qr/seo-idqr` | QRs para SEO | ✅ |
| GET | `/qr` | Listar QRs (paginado) | ❌ |
| GET | `/qr/:id` | Detalle de QR | ❌ |
| GET | `/qr/user/favorites` | QRs favoritos del usuario | ❌ |
| GET | `/qr/user/:userId` | QRs de un usuario | ❌ |
| PATCH | `/qr/:id` | Actualizar QR | ❌ |
| DELETE | `/qr/:id` | Eliminar QR | ❌ |
| GET | `/qr/user/:userId/paginated` | QRs de un usuario paginado | ❌ |
| GET | `/qr/public/:id` | Redirección pública de QR | ✅ |

### Escaneos — `/scan`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| POST | `/scan/stats` | Registrar estadística de escaneo | ✅ |
| GET | `/scan/:idQr/stats` | Estadísticas de un QR | ❌ |
| GET | `/scan/:idQr/recent` | Escaneos recientes | ❌ |
| GET | `/scan/:idQr/daily` | Estadísticas diarias | ❌ |
| GET | `/scan/:idQr/locations` | Estadísticas por ubicación | ❌ |
| GET | `/scan/:idQr/devices` | Estadísticas por dispositivo | ❌ |

### Planes — `/plan`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| POST | `/plan` | Crear plan | ❌ |
| GET | `/plan` | Listar planes | ✅ |
| GET | `/plan/:id` | Detalle de plan | ❌ |
| PATCH | `/plan/:id` | Actualizar plan | ❌ |
| DELETE | `/plan/:id` | Eliminar plan | ❌ |

### Pet Tags — `/pet-tag`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| POST | `/pet-tag/admin/generate` | Generar placas (admin) | ❌ |
| GET | `/pet-tag/admin/reserved` | Placas reservadas (admin) | ❌ |
| GET | `/pet-tag/public/status/:idQr` | Estado público de una placa | ✅ |
| PATCH | `/pet-tag/update/:petTagId` | Actualizar placa | ❌ |
| PATCH | `/pet-tag/activate` | Activar placa | ❌ |
| PATCH | `/pet-tag/:idQr` | Actualizar placa por QR | ❌ |

### Activación QR — `/qr-activate`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| POST | `/qr-activate` | Crear activación | ❌ |
| GET | `/qr-activate` | Listar activaciones | ❌ |
| GET | `/qr-activate/:id` | Detalle de activación | ❌ |
| PATCH | `/qr-activate/webpay/:token_ws` | Actualizar tras pago Webpay | ✅ |
| PATCH | `/qr-activate/:id` | Actualizar activación | ❌ |
| DELETE | `/qr-activate/:id` | Eliminar activación | ❌ |

### Generación gratuita — `/qr-free-generation`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| POST | `/qr-free-generation` | Crear generación gratuita | ✅ |
| GET | `/qr-free-generation` | Listar generaciones | ❌ |
| GET | `/qr-free-generation/:id` | Detalle de generación | ❌ |

### Estadísticas — `/statistics`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| GET | `/statistics/user/:userId` | Estadísticas de un usuario | ❌ |
| GET | `/statistics/system` | Estadísticas del sistema | ❌ |

### Email — `/mail`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| POST | `/mail/contact` | Enviar formulario de contacto | ✅ |

### Webpay — `/webpay`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| POST | `/webpay/create` | Crear transacción | ✅ |
| GET | `/webpay/return` | Retorno post-pago | ✅ |
| POST | `/webpay/refund` | Reembolsar transacción | ✅ |
| GET | `/webpay/status` | Estado de transacción | ✅ |
| GET | `/webpay/transaction/:token` | Detalle de transacción | ✅ |

### Health — `/health`

| Método | Ruta | Descripción | Público |
| --- | --- | --- | --- |
| GET | `/health` | Estado del servicio y conexión MongoDB | ✅ |

## Docker

El `Dockerfile` es multi-stage:

- **builder**: compila la aplicación
- **development**: hot-reload (`npm run dev`)
- **production**: solo dependencias de producción + `dist/`

```bash
# Build de la imagen
docker build -t backend-portaqr .

# Ejecutar en modo desarrollo
docker run -p 3001:3001 --env-file .env backend-portaqr
```

> El servicio está pensado para orquestarse con el `docker-compose.yml` raíz del proyecto (`mongo` + `mongo-express` + `backend-portaqr` + `qr-app`).

## Testing

```bash
npm run test          # Tests unitarios
npm run test:cov      # Cobertura
npm run test:e2e      # Tests end-to-end
```

Los tests unitarios (`.spec.ts`) viven junto al código que prueban.

## Documentación relacionada

- [SPEC-001: Migración de 3 microservicios a Monolito Modular](../../docs/spec/SPEC-001-migracion-monolito-modular.md) — contexto, decisiones y contrato de la API.
- [AGENTS.md](../../AGENTS.md) — reglas globales del proyecto Plataforma QR.