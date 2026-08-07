# backend-portaqr

Monolito modular **NestJS** que unifica `bff-service` + `user-service` + `qr-service` en un único proceso (puerto **3001**), según [SPEC-001: Migración de 3 microservicios a Monolito Modular](../../docs/spec/SPEC-001-migracion-monolito-modular.md).

Elimina la duplicación de código (~40%), el borde HTTP interno con `any` (`@nestjs/axios` + `firstValueFrom`) y los 3 deploys separados, manteniendo la superficie pública del BFF como contrato con el frontend `qr-app`.

## Stack tecnológico

| Capa | Tecnología |
| ---- | ---------- |
| Framework | NestJS 10, TypeScript 5 |
| Base de datos | MongoDB (BD `sistema`) vía Mongoose 8 |
| Autenticación | JWT **RS256** (access + refresh), Passport, bcrypt, logout con `tokenVersion` |
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
| `JWT_PRIVATE_KEY` | Llave **privada** RSA (firma) — ver [Creación de llaves JWT](#creación-de-llaves-jwt-rs256) | — |
| `JWT_PUBLIC_KEY` | Llave **pública** RSA (verificación, se comparte con el frontend) | — |
| `JWT_EXPIRATION` | Vida del access token | `24h` |
| `JWT_REFRESH_EXPIRATION` | Vida del refresh token | `7d` |
| `WEBPAY_COMMERCE_CODE` | Código de comercio Webpay | — |
| `WEBPAY_API_KEY` | API key de Webpay | — |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Configuración SMTP para emails | — |

> ⚠️ **Nunca** commitees el archivo `.env`. Está excluido por `.gitignore`.
>
> ⚠️ La llave **privada** (`JWT_PRIVATE_KEY`) **nunca debe salir del backend** ni publicarse. La **pública** (`JWT_PUBLIC_KEY`) es segura de compartir y debe coincidir con la del frontend (`qr-app/.env`).

## Creación de llaves JWT (RS256)

El backend firma los JWT con **RS256** (par de llaves asimétricas RSA 2048):

- **Backend** firma con la llave **privada** (nunca se expone).
- **Frontend** (`qr-app`) verifica con la llave **pública** — puede estar en el frontend sin riesgo; robarla NO permite forjar tokens (a diferencia de HS256, donde el secreto compartido sí lo permite).

### Generar el par de llaves

**Opción A — Script del proyecto (recomendado):**

```bash
npm run generate:jwt-env
```

Genera el par RSA 2048, lo guarda en `keys/` (`jwt-private.pem` + `jwt-public.pem`) e imprime ambas variables en **una sola línea** (con `\n` literales) listas para pegar en el `.env`:

```
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIj...\n-----END PUBLIC KEY-----"
```

Para solo formatear las llaves existentes sin rotar:

```bash
npm run generate:jwt-env -- --use-existing
```

**Opción B — Manual con OpenSSL:**

```bash
# Generar llave privada (PKCS#8 PEM)
openssl genpkey -algorithm RSA -out jwt-private.pem -pkeyopt rsa_keygen_bits:2048
# Derivar llave pública
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
# Convertir a una línea (para .env)
awk '{printf "%s\\n", $0}' jwt-private.pem   # y jwt-public.pem
```

### Formatos aceptados por `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`

| Formato | Ejemplo | Uso |
| --- | --- | --- |
| **Contenido PEM directo** | `JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"` | **Recomendado** (Railway, despliegues, sin archivos) |
| **Ruta a archivo PEM** | `JWT_PRIVATE_KEY=keys/jwt-private.pem` | Local / formato legacy |

Los `\n` literales del formato a) se normalizan automáticamente a saltos de línea reales.

### Consideraciones de seguridad

1. **La llave privada nunca se commitea**: `keys/` y `*.pem` están en `.gitignore`; el `.env` también.
2. **Rotación de llaves**: al ejecutar `npm run generate:jwt-env` (sin `--use-existing`) se genera un par nuevo → **todos los tokens emitidos quedan inválidos** (los usuarios deben volver a iniciar sesión). Tras rotar:
   - Actualizar `JWT_PRIVATE_KEY` y `JWT_PUBLIC_KEY` en el backend (`.env` / Railway).
   - Actualizar `JWT_PUBLIC_KEY` en el **frontend** `qr-app/.env` con la nueva llave pública.
   - Reiniciar ambos servicios.
3. **La pública debe coincidir en backend y frontend**: si difieren, la verificación falla con 401 en toda la app.
4. **Fallback en desarrollo**: si no hay llaves configuradas, el backend genera un par RSA **efímero en memoria** (solo para dev/tests — firma/verificación consistentes en el mismo proceso, pero los tokens no sobreviven reinicios). En producción SIEMPRE define las llaves reales.
5. **Logout real**: al hacer `POST /auth/logout` se incrementa `tokenVersion` del usuario → todos sus tokens (access y refresh) quedan revocados al instante.

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
| `npm run generate:jwt-env` | Genera el par de llaves RSA y lo imprime en una línea para `.env` (ver [Creación de llaves JWT](#creación-de-llaves-jwt-rs256)) |

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
| POST | `/auth/logout` | Cierra sesión (revoca todos los tokens vía `tokenVersion`) | ❌ |
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

## Repositorios

Componentes activos de la plataforma PortaQR:

| Componente | Repositorio | Descripción |
| ---------- | ----------- | ----------- |
| `qr-app` | [FabioBustosTech/qr-app](https://github.com/FabioBustosTech/qr-app) | Frontend Next.js de la plataforma |
| `backend-portaqr` | [FabioBustosTech/backend-portaqr](https://github.com/FabioBustosTech/backend-portaqr) | Monolito modular NestJS (backend) |
| `e2e-tests-portaqr` | [FabioBustosTech/e2e-tests-portaqr](https://github.com/FabioBustosTech/e2e-tests-portaqr) | Suite de tests E2E de la plataforma |

## Documentación relacionada

- [SPEC-001: Migración de 3 microservicios a Monolito Modular](../../docs/spec/SPEC-001-migracion-monolito-modular.md) — contexto, decisiones y contrato de la API.
- [AGENTS.md](../../AGENTS.md) — reglas globales del proyecto Plataforma QR.