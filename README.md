# TravelGo Backend
## API desplegada

- API pública: https://travelgo-njke.up.railway.app
- Swagger UI: https://travelgo-njke.up.railway.app/api-docs
- Healthcheck: https://travelgo-njke.up.railway.app/api/health
- OpenAPI JSON: https://travelgo-njke.up.railway.app/api-docs.json

Backend de **TravelGo**, una billetera digital multi-moneda desarrollada para el Proyecto Final de Henry.

La API permite registrar usuarios, iniciar sesión con email y contraseña o con Google, administrar una wallet, consultar balances y obtener tasas de cambio. Todas las operaciones financieras son simuladas y no utilizan dinero real.

## Estado actual

- Backend desarrollado con Express y TypeScript.
- PostgreSQL configurado localmente y en producción.
- API desplegada en Railway.
- Migraciones SQL automatizadas e idempotentes.
- Registro y login tradicional con JWT.
- Inicio de sesión con Google Identity Services.
- Rutas privadas protegidas mediante middleware.
- Wallet creada automáticamente al registrar un usuario.
- Balances iniciales creados para cinco monedas.
- Consulta protegida de wallet y balances.
- Consulta pública de tasas de cambio.
- Cache de tasas almacenado en PostgreSQL.
- Documentación OpenAPI y Swagger UI.
- Servicio de emails transaccionales mediante AWS SES.
- Validación de variables de entorno y feature flags.
- CORS configurable mediante variables de entorno.
- Build de TypeScript validado.
- Migraciones ejecutadas varias veces sin duplicar estructura.
- Login con Google validado sin duplicar usuario, wallet ni balances.
- Envío real mediante AWS SES validado con `messageId`.

## Tecnologías

- Node.js
- Express
- TypeScript
- PostgreSQL
- pg
- JSON Web Token
- bcryptjs
- Zod
- dotenv
- cors
- tsx
- google-auth-library
- AWS SDK para SES
- Swagger UI Express
- OpenAPI 3.0.3

## Estructura del proyecto

```txt
TravelGo-backend/
├── scripts/                               # Scripts ejecutados fuera de src
│   └── migrate.mjs                        # Ejecuta schema.sql y migraciones numeradas en orden
│
├── src/                                   # Código fuente principal en TypeScript
│   ├── config/                            # Configuración y reglas compartidas
│   │   ├── currencies.ts                  # Monedas soportadas: ARS, USD, EUR, BRL y CLP
│   │   ├── env.ts                         # Lectura/validación de variables de entorno y feature flags
│   │   └── transactions.ts                # Tipos y reglas base de operaciones financieras simuladas
│   │
│   ├── db/                                # Acceso a PostgreSQL
│   │   ├── checkConnection.ts             # Verifica disponibilidad de PostgreSQL antes de iniciar
│   │   └── pool.ts                        # Pool global de conexiones utilizado por repositorios
│   │
│   ├── dev/                               # Herramientas disponibles solo en desarrollo
│   │   └── google-login-test.page.ts      # Página local para probar Google Login y rutas protegidas
│   │
│   ├── docs/                              # Documentación técnica de la API
│   │   └── openapi.ts                     # Documento OpenAPI 3.0.3 usado por Swagger UI
│   │
│   ├── middlewares/                       # Middlewares globales de Express
│   │   ├── auth.middleware.ts             # Valida JWT y agrega req.user
│   │   └── error.middleware.ts            # Manejo centralizado de errores HTTP
│   │
│   ├── migrations/                        # Esquema base y cambios incrementales idempotentes
│   │   ├── schema.sql                     # Esquema base: users, wallets, balances, transactions, rates cache
│   │   ├── 002_google_auth.sql            # Soporte Google Login: google_id, avatar_url y password nullable
│   │   ├── 003_transactions_operations.sql # Ajustes para depósitos, transferencias, exchanges e idempotencia
│   │   └── 004_auth_password_reset_tokens.sql # Tokens hasheados para recuperación de contraseña
│   │
│   ├── modules/                           # Funcionalidades agrupadas por dominio
│   │   ├── auth/                          # Registro, login, Google Login, JWT y recuperación de contraseña
│   │   │   ├── auth.controller.ts         # Controladores HTTP de autenticación
│   │   │   ├── auth.repository.ts         # Consultas SQL de usuarios y credenciales
│   │   │   ├── auth.routes.ts             # Rutas /api/auth/*
│   │   │   ├── auth.schemas.ts            # Validaciones Zod de auth
│   │   │   ├── auth.service.ts            # Lógica de negocio de autenticación
│   │   │   └── password-reset.repository.ts # Persistencia de tokens de recuperación
│   │   │
│   │   ├── balances/                      # Creación y acceso a balances por moneda
│   │   │
│   │   ├── chat/                          # Chatbot TravelGo con Gemini
│   │   │   ├── chat.controller.ts         # Controlador POST /api/chat
│   │   │   ├── chat.memory.ts             # Historial temporal en memoria con TTL de 20 minutos
│   │   │   ├── chat.routes.ts             # Rutas del chatbot
│   │   │   ├── chat.schemas.ts            # Validación de sessionId y message
│   │   │   └── chat.service.ts            # Lógica de llamada a Gemini y system prompt TravelGo-only
│   │   │
│   │   ├── rates/                         # Consulta pública de tasas y cache en PostgreSQL
│   │   │   ├── rates.controller.ts        # Controladores de tasas
│   │   │   ├── rates.provider.ts          # Cliente del proveedor externo de tasas
│   │   │   ├── rates.repository.ts        # Cache de tasas en PostgreSQL
│   │   │   ├── rates.routes.ts            # Rutas /api/rates
│   │   │   └── rates.service.ts           # Normalización y estrategia de cache
│   │   │
│   │   ├── transactions/                  # Operaciones simuladas y actividad reciente
│   │   │   ├── transactions.controller.ts # Controladores deposit, transfer, exchange y recent
│   │   │   ├── transactions.repository.ts # Queries SQL, locks, balances y lectura de historial
│   │   │   ├── transactions.routes.ts     # Rutas /api/transactions/*
│   │   │   ├── transactions.schemas.ts    # Validaciones Zod de operaciones y query limit
│   │   │   └── transactions.service.ts    # Lógica transaccional, idempotencia y normalización
│   │   │
│   │   └── wallet/                        # Creación de wallet y consulta de balances
│   │       ├── wallet.controller.ts       # Controlador de wallet/balances
│   │       ├── wallet.repository.ts       # Consultas SQL de wallets y balances
│   │       ├── wallet.routes.ts           # Ruta protegida /api/wallet/balances
│   │       └── wallet.service.ts          # Lógica de consulta de wallet del usuario
│   │
│   ├── scripts/                           # Scripts TypeScript auxiliares
│   │   └── testTransactionEmail.ts        # Prueba manual de email transaccional con AWS SES
│   │
│   ├── services/                          # Integraciones externas reutilizables
│   │   └── email.service.ts               # Construcción/envío de emails con AWS SES
│   │
│   ├── types/                             # Extensiones de tipos TypeScript
│   │   └── express.d.ts                   # Agrega req.user al tipo Request de Express
│   │
│   ├── utils/                             # Utilidades compartidas
│   │   ├── AppError.ts                    # Error controlado con status HTTP
│   │   ├── asyncHandler.ts                # Wrapper para controladores async
│   │   └── jwt.ts                         # Firma y validación de JWT TravelGo
│   │
│   ├── app.ts                             # Configura Express, CORS, Swagger, rutas y middlewares
│   └── server.ts                          # Verifica PostgreSQL e inicia el servidor HTTP
│
├── .env                                   # Variables locales privadas; no se sube a Git
├── .env.example                           # Plantilla segura de variables requeridas
├── .gitignore                             # Excluye secretos, dependencias y archivos generados
├── package.json                           # Dependencias y scripts npm
├── package-lock.json                      # Versiones exactas de dependencias
├── README.md                              # Documentación principal del proyecto
└── tsconfig.json                          # Configuración TypeScript

`dist/` se genera con `npm run build` y contiene el JavaScript compilado. No debe editarse manualmente ni versionarse.

## Módulos principales

### Autenticación

El módulo `src/modules/auth/` gestiona:

- Registro tradicional con nombre, email y contraseña.
- Cifrado de contraseña mediante bcrypt.
- Login tradicional.
- Generación de JWT propios de TravelGo.
- Consulta del usuario autenticado.
- Login mediante Google Identity Services.
- Creación de usuarios Google sin contraseña local.
- Asociación del `google_id` y avatar del usuario.
- Reutilización de una cuenta Google existente sin duplicar wallet ni balances.

El frontend obtiene una credencial de Google y la envía al backend:

```txt
Google Identity Services
→ credential de Google
→ POST /api/auth/google
→ validación en el backend
→ creación o recuperación del usuario
→ generación de JWT TravelGo
```

El backend nunca utiliza el token de Google como token de sesión interno. Después de validar Google, devuelve un JWT propio de TravelGo.

### Wallet

Cada usuario posee una única wallet.

La wallet se crea automáticamente cuando se registra un usuario tradicional o cuando se crea por primera vez una cuenta mediante Google.

### Balances

Cada wallet contiene un balance por moneda soportada.

Monedas actuales:

- ARS
- USD
- EUR
- BRL
- CLP

Balances iniciales:

```txt
ARS = 100000
USD = 0
EUR = 0
BRL = 0
CLP = 0
```

### Tasas de cambio

El módulo `rates` consulta tasas externas y guarda los resultados en PostgreSQL.

La cache evita solicitar repetidamente la misma información al proveedor externo y reduce tiempos de respuesta y dependencia de red.

### Emails transaccionales

El servicio `src/services/email.service.ts` utiliza AWS SES para enviar confirmaciones de operaciones.

Actualmente está validado mediante el script:

```bash
npm run email:test
```

El servicio soporta los tipos:

- BUY
- SELL
- EXCHANGE

El test real de AWS SES fue validado correctamente y devolvió:

```json
{
  "sent": true,
  "messageId": "..."
}
```

El servicio de email ya funciona, pero todavía debe conectarse al flujo definitivo de transacciones cuando ese módulo sea implementado.

El email debe enviarse después de confirmar y guardar una transacción. Un error de email no debe revertir una transacción ya confirmada.

### Swagger y OpenAPI

La API incluye documentación interactiva:

```txt
GET /api-docs
GET /api-docs.json
```

- `/api-docs` abre Swagger UI.
- `/api-docs.json` devuelve el documento OpenAPI 3.0.3.

Swagger permite consultar contratos, parámetros, respuestas y probar endpoints directamente desde el navegador.

## Base de datos

La base de datos local se llama:

```txt
travelgo
```

Tablas principales:

- `users`
- `wallets`
- `balances`
- `transactions`
- `exchange_rates_cache`

### users

Almacena:

- ID del usuario.
- Nombre.
- Email único.
- Contraseña cifrada cuando utiliza login tradicional.
- Google ID cuando utiliza Google Login.
- URL del avatar de Google.
- Fechas de creación y actualización.

Una cuenta puede autenticarse mediante contraseña, Google o ambos métodos, según su configuración.

### wallets

Representa la billetera asociada a un usuario.

Cada usuario debe tener una única wallet.

### balances

Guarda el saldo de cada moneda dentro de una wallet.

La combinación wallet y moneda debe ser única para evitar balances duplicados.

### transactions

Está preparada para almacenar operaciones simuladas:

- `BUY`
- `SELL`
- `EXCHANGE`

La implementación completa de compra, venta e intercambio continúa como siguiente etapa del proyecto.

### exchange_rates_cache

Almacena tasas externas temporalmente para evitar consultas repetidas al proveedor.

## Migraciones

Las migraciones se ejecutan con:

```bash
npm run db:migrate
```

El script `scripts/migrate.mjs`:

1. Espera a que PostgreSQL esté disponible.
2. Ejecuta primero `schema.sql`.
3. Ejecuta después las migraciones numeradas en orden.
4. Utiliza una transacción por archivo.
5. Reintenta la conexión ante errores transitorios.
6. Permite repetir la ejecución sin duplicar columnas, índices o restricciones.

Migraciones actuales:

```txt
schema.sql
002_google_auth.sql
```

La idempotencia fue validada ejecutando las migraciones dos veces consecutivas sin errores.

## Variables de entorno

Crear un archivo `.env` en la raíz tomando como base `.env.example`:

```env
PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:CONTRASEÑA@localhost:5432/travelgo

JWT_SECRET=GENERAR_UN_SECRETO_SEGURO
JWT_EXPIRES_IN=1d

FRONTEND_ORIGINS=http://localhost:5173

GOOGLE_AUTH_ENABLED=false
GOOGLE_CLIENT_ID=

EMAIL_ENABLED=false
AWS_REGION=
AWS_SES_FROM_EMAIL=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
```

### Variables generales

- `PORT`: puerto HTTP del backend.
- `NODE_ENV`: entorno actual, por ejemplo `development` o `production`.
- `DATABASE_URL`: conexión completa a PostgreSQL.
- `JWT_SECRET`: secreto utilizado para firmar los JWT de TravelGo.
- `JWT_EXPIRES_IN`: tiempo de expiración del token.
- `FRONTEND_ORIGINS`: orígenes permitidos por CORS, separados por coma.

### Google Login

- `GOOGLE_AUTH_ENABLED`: activa o desactiva Google Login.
- `GOOGLE_CLIENT_ID`: Client ID del cliente OAuth tipo Web Application.

Ejemplo local:

```env
GOOGLE_AUTH_ENABLED=true
GOOGLE_CLIENT_ID=CLIENT_ID.apps.googleusercontent.com
```

En Google Cloud debe autorizarse el origen exacto del frontend o de la página de prueba, por ejemplo:

```txt
http://localhost:3000
```

### AWS SES

- `EMAIL_ENABLED`: activa o desactiva el envío real de emails.
- `AWS_REGION`: región donde está configurado SES.
- `AWS_SES_FROM_EMAIL`: dirección remitente verificada.
- `AWS_ACCESS_KEY_ID`: credencial IAM.
- `AWS_SECRET_ACCESS_KEY`: secreto IAM.
- `AWS_SESSION_TOKEN`: solo cuando se usan credenciales temporales.

En modo sandbox de SES, el remitente y el destinatario deben estar verificados en la misma región.

Las variables reales de producción se configuran directamente en Railway. No deben guardarse en GitHub ni escribirse dentro del código.

## Seguridad y configuración

- `.env` está ignorado por Git.
- Los secretos no se incluyen en `.env.example`.
- Las credenciales no se hardcodean.
- El backend utiliza JWT propios de TravelGo.
- Las contraseñas se almacenan cifradas.
- Las rutas privadas utilizan middleware de autenticación.
- CORS se configura mediante `FRONTEND_ORIGINS`.
- Google Login puede desactivarse mediante feature flag.
- AWS SES puede desactivarse mediante feature flag.
- La página `/dev/google-login` solo se registra fuera de producción.
- `dist/` es generado y no se versiona.

## Scripts disponibles

### Instalar dependencias

```bash
npm install
```

### Ejecutar migraciones

```bash
npm run db:migrate
```

### Comprobar PostgreSQL

```bash
npm run db:check
```

### Iniciar el servidor en desarrollo

```bash
npm run dev
```

### Compilar TypeScript

```bash
npm run build
```

### Ejecutar la versión compilada

```bash
npm start
```

### Probar AWS SES

```bash
npm run email:test
```

El script recibe un JSON mediante entrada estándar con los datos de una transacción simulada.

## Endpoints actuales

### Información general

```http
GET /
```

Devuelve información básica y enlaces a healthcheck y documentación.

### Estado del servidor

```http
GET /api/health
```

Comprueba que la API y PostgreSQL estén disponibles.

### Registro

```http
POST /api/auth/register
```

Crea automáticamente:

1. Un usuario.
2. Una wallet.
3. Cinco balances iniciales.

Ejemplo:

```json
{
  "name": "Usuario Demo",
  "email": "usuario@ejemplo.com",
  "password": "ClaveSegura123"
}
```

### Login tradicional

```http
POST /api/auth/login
```

Valida email y contraseña y devuelve un JWT TravelGo.

### Login con Google

```http
POST /api/auth/google
```

Recibe:

```json
{
  "credential": "TOKEN_DEVUELTO_POR_GOOGLE"
}
```

Valida la credencial de Google y devuelve:

- Usuario TravelGo.
- JWT propio de TravelGo.
- `isNewUser`.
- `accountLinked`.

### Usuario autenticado

```http
GET /api/auth/me
```

Requiere:

```http
Authorization: Bearer TOKEN
```

### Wallet y balances

```http
GET /api/wallet/balances
```

Ruta protegida que devuelve la wallet y todos sus balances.

La ruta `/api/balances` no existe.

### Tasas de cambio

```http
GET /api/rates
GET /api/rates?base=USD
GET /api/rates/ARS/USD
```

Son rutas públicas y no requieren JWT.

### Documentación

```http
GET /api-docs
GET /api-docs.json
```

### Página de prueba de Google Login

```http
GET /dev/google-login
```

Solo está disponible cuando:

```env
NODE_ENV=development
```

Permite validar desde el navegador:

- Inicio de sesión con Google.
- Generación de JWT TravelGo.
- `GET /api/auth/me`.
- `GET /api/wallet/balances`.

## Flujos validados

### Registro tradicional

```txt
Usuario se registra
→ contraseña cifrada
→ usuario guardado
→ wallet creada
→ cinco balances creados
→ login
→ JWT TravelGo
→ consulta de perfil
→ consulta de balances
```

### Login con Google

```txt
Usuario selecciona su cuenta Google
→ Google entrega credential
→ backend valida firma, audiencia y vencimiento
→ busca o crea el usuario
→ conserva una única wallet
→ conserva cinco balances
→ genera JWT TravelGo
→ habilita rutas privadas
```

Validaciones realizadas:

```txt
POST /api/auth/google       → 200
GET /api/auth/me            → 200
GET /api/wallet/balances    → 200
Usuario Google repetido     → no duplica usuario
Wallet                      → una sola
Balances                    → cinco
```

### AWS SES

```txt
Script de prueba
→ validación Zod
→ construcción del email
→ envío mediante AWS SES
→ respuesta sent: true
→ messageId generado
```

## Pruebas antes de producción

Todo cambio debe probarse primero localmente:

```bash
npm run db:migrate
npm run build
npm run dev
```

Después deben validarse los endpoints principales y revisar los cambios:

```bash
git status --short
git diff
git diff --check
```

Flujo de publicación:

```txt
pruebas locales
→ commit en back_end
→ push
→ Pull Request hacia main
→ merge
→ deploy automático en Railway
→ migraciones de producción
→ pruebas sobre la URL pública
```

## Estado validado

```txt
BUILD TYPESCRIPT: PASS
MIGRACIONES IDEMPOTENTES: PASS
LOGIN TRADICIONAL: PASS
LOGIN GOOGLE: PASS
JWT TRAVELGO: PASS
PERFIL PROTEGIDO: PASS
WALLET Y BALANCES: PASS
TASAS DE CAMBIO: PASS
SWAGGER / OPENAPI: PASS
AWS SES: PASS
```

## Próximos pasos

- Implementar compra de monedas.
- Implementar venta de monedas.
- Implementar intercambio entre monedas.
- Guardar historial real de transacciones simuladas.
- Conectar el envío de emails SES al cierre exitoso de cada transacción.
- Agregar consulta de historial de operaciones.
- Incorporar pruebas automatizadas unitarias y de integración.
- Configurar las variables de producción en Railway.
- Integrar Google Login desde el frontend definitivo.
- Actualizar `FRONTEND_ORIGINS` cuando exista el dominio público del frontend.

## Consideraciones

TravelGo es un proyecto educativo. Los saldos, compras, ventas e intercambios son simulados y no representan dinero real ni servicios financieros regulados.
