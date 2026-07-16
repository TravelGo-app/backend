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
- Cinco balances por wallet, todos inicializados en cero.
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
- Suite automatizada con tests unitarios, integración HTTP, cobertura y typecheck de tests.

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
├── .activity-history-backups/
│   ├── 20260716_020804/
│   │   └── src/
│   │       ├── docs/
│   │       │   └── openapi.ts
│   │       ├── modules/
│   │       │   └── profile/
│   │       │       └── profile.service.ts
│   │       └── app.ts
│   └── repair_v2_20260716_021435/
│       └── src/
│           ├── docs/
│           │   └── openapi.ts
│           ├── migrations/
│           │   └── 20260716_activity_history.sql
│           ├── modules/
│           │   ├── activity-history/
│           │   │   ├── activity-history.controller.ts
│           │   │   ├── activity-history.repository.ts
│           │   │   ├── activity-history.routes.ts
│           │   │   ├── activity-history.schemas.ts
│           │   │   ├── activity-history.service.ts
│           │   │   └── activity-history.types.ts
│           │   └── profile/
│           │       └── profile.service.ts
│           └── app.ts
├── scripts/
│   └── migrate.mjs
├── src/
│   ├── config/
│   │   ├── currencies.ts
│   │   ├── env.ts
│   │   └── transactions.ts
│   ├── db/
│   │   ├── checkConnection.ts
│   │   └── pool.ts
│   ├── dev/
│   │   └── google-login-test.page.ts
│   ├── docs/
│   │   └── openapi.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── email-availability-rate-limit.middleware.ts
│   │   └── error.middleware.ts
│   ├── migrations/
│   │   ├── 002_google_auth.sql
│   │   ├── 003_transactions_operations.sql
│   │   ├── 004_auth_password_reset_tokens.sql
│   │   ├── 005_transaction_analytics_indexes.sql
│   │   ├── 006_profile_travelgo_identifiers.sql
│   │   ├── 007_email_outbox_notifications.sql
│   │   ├── 20260716_activity_history.sql
│   │   └── schema.sql
│   ├── modules/
│   │   ├── activity-history/
│   │   │   ├── activity-history.controller.ts
│   │   │   ├── activity-history.repository.ts
│   │   │   ├── activity-history.routes.ts
│   │   │   ├── activity-history.schemas.ts
│   │   │   ├── activity-history.service.ts
│   │   │   └── activity-history.types.ts
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.schemas.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── google-auth.service.ts
│   │   │   └── password-reset.repository.ts
│   │   ├── balances/
│   │   │   └── balances.repository.ts
│   │   ├── chat/
│   │   │   ├── chat.controller.ts
│   │   │   ├── chat.memory.ts
│   │   │   ├── chat.routes.ts
│   │   │   ├── chat.schemas.ts
│   │   │   └── chat.service.ts
│   │   ├── email-outbox/
│   │   │   ├── dashboard-summary.service.ts
│   │   │   ├── email-notifications.service.ts
│   │   │   ├── email-outbox.repository.ts
│   │   │   ├── email-outbox.worker.ts
│   │   │   └── email-templates.ts
│   │   ├── profile/
│   │   │   ├── email-change.repository.ts
│   │   │   ├── profile.controller.ts
│   │   │   ├── profile.repository.ts
│   │   │   ├── profile.routes.ts
│   │   │   ├── profile.schemas.ts
│   │   │   └── profile.service.ts
│   │   ├── rates/
│   │   │   ├── rates.controller.ts
│   │   │   ├── rates.provider.ts
│   │   │   ├── rates.repository.ts
│   │   │   ├── rates.routes.ts
│   │   │   └── rates.service.ts
│   │   ├── transactions/
│   │   │   ├── transactions.controller.ts
│   │   │   ├── transactions.repository.ts
│   │   │   ├── transactions.routes.ts
│   │   │   ├── transactions.schemas.ts
│   │   │   └── transactions.service.ts
│   │   └── wallet/
│   │       ├── wallet.controller.ts
│   │       ├── wallet.repository.ts
│   │       ├── wallet.routes.ts
│   │       └── wallet.service.ts
│   ├── scripts/
│   │   └── testTransactionEmail.ts
│   ├── services/
│   │   └── email.service.ts
│   ├── types/
│   │   └── express.d.ts
│   ├── utils/
│   │   ├── AppError.ts
│   │   ├── asyncHandler.ts
│   │   ├── jwt.ts
│   │   └── password.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── integration/
│   │   └── app.public.test.ts
│   ├── unit/
│   │   ├── auth.schemas.test.ts
│   │   ├── chat-activity.schemas.test.ts
│   │   ├── chat-memory.test.ts
│   │   ├── config.test.ts
│   │   ├── email-disabled.test.ts
│   │   ├── openapi.test.ts
│   │   ├── profile.schemas.test.ts
│   │   ├── transactions.schemas.test.ts
│   │   └── utils-middlewares.test.ts
│   └── setup.ts
├── .env.example
├── .gitignore
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.test.json
└── vitest.config.ts
```

<!-- TRAVELGO_AUTOMATED_TESTS_START -->

## Validación automatizada

La suite determinística no utiliza la base de datos real, AWS SES, Google ni Gemini. Las dependencias externas se deshabilitan o simulan para que los resultados sean repetibles.

Comandos disponibles:

```bash
npm test                  # Suite completa
npm run test:unit         # Reglas, schemas, utilidades y middlewares
npm run test:integration  # Contratos HTTP públicos con PostgreSQL simulado
npm run test:coverage     # Suite completa con reporte de cobertura
npm run typecheck:test    # TypeScript de código y tests
npm run build             # Compilación productiva
npm run validate          # Build + typecheck de tests + cobertura
```

Los chequeos reales de PostgreSQL, AWS SES y otros proveedores externos se ejecutan por separado porque dependen de credenciales, conectividad y servicios activos.

<!-- TRAVELGO_AUTOMATED_TESTS_END -->txt
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
ARS = 0
USD = 0
EUR = 0
BRL = 0
CLP = 0
```

Los depósitos son simulados, pero los saldos y movimientos se persisten realmente en PostgreSQL. El backend no carga saldos promocionales ni operaciones de demostración desde el código.

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

### Operaciones simuladas persistidas

```http
POST /api/transactions/deposit
POST /api/transactions/transfer
POST /api/transactions/exchange
GET  /api/transactions/recent?limit=10
GET  /api/transactions/analytics?days=30
```

Estas rutas requieren JWT. Los depósitos no representan dinero real, pero depósitos, transferencias, intercambios, balances, actividad y series para gráficos se almacenan o calculan desde PostgreSQL.

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

- Consumir `/api/transactions/analytics` desde los gráficos del frontend.
- Implementar compra de monedas.
- Implementar venta de monedas.
- Implementar intercambio entre monedas.
- Conectar el envío de emails SES al cierre exitoso de cada transacción.
- Incorporar pruebas automatizadas unitarias y de integración.
- Configurar las variables de producción en Railway.
- Integrar Google Login desde el frontend definitivo.
- Actualizar `FRONTEND_ORIGINS` cuando exista el dominio público del frontend.

## Consideraciones

TravelGo es un proyecto educativo. Los saldos, compras, ventas e intercambios son simulados y no representan dinero real ni servicios financieros regulados.

## Perfil e identificadores TravelGo simulados

TravelGo no opera con dinero real. Cada wallet recibe automáticamente dos identificadores internos persistidos en PostgreSQL:

- `travelgoCvu`: número simulado de 22 dígitos, único e inmutable.
- `travelgoAlias`: alias único y editable.

El CVU se muestra siempre como **CVU TravelGo simulado** y solo sirve para transferencias dentro de la plataforma.

### Perfil

Rutas protegidas con JWT:

```http
GET /api/profile
PATCH /api/profile
PATCH /api/profile/alias
POST /api/profile/email-change/request
```

Confirmación pública mediante token de un solo uso:

```http
POST /api/profile/email-change/confirm
```

`PATCH /api/profile` admite:

```json
{
  "name": "Juan Pérez",
  "phone": "+5491123456789",
  "birthDate": "2000-05-14",
  "preferredCurrency": "ARS"
}
```

La fecha de nacimiento debe corresponder a una persona con al menos 17 años. El teléfono se normaliza al formato internacional E.164. La foto de Google se usa automáticamente cuando está disponible; en caso contrario el frontend debe mostrar las iniciales devueltas por el perfil.

El cambio de email requiere un enlace enviado al nuevo correo. Hasta que el enlace se confirma, el email actual permanece sin cambios.

### Transferencias por email, alias o CVU

El campo recomendado es `recipientIdentifier`:

```json
{
  "recipientIdentifier": "juan.viajes",
  "currencyCode": "ARS",
  "amount": "2500",
  "idempotencyKey": "transfer-uuid-unico"
}
```

También acepta un email o un CVU TravelGo simulado de 22 dígitos. `recipientEmail` continúa aceptándose temporalmente para no romper el frontend anterior.

## Notificaciones automáticas por correo y outbox

TravelGo encola correos persistentes en PostgreSQL y los envía mediante Amazon SES sin hacer depender las operaciones monetarias simuladas de la disponibilidad inmediata del proveedor.

Eventos automáticos:

- bienvenida al completar un registro tradicional o con Google;
- depósito simulado completado;
- transferencia enviada;
- transferencia recibida;
- intercambio completado;
- recordatorio del dashboard cinco minutos después del login, como máximo una vez cada 24 horas.

El resumen completo del dashboard es manual:

```http
POST /api/profile/dashboard-summary-email
Authorization: Bearer JWT
Content-Type: application/json

{
  "days": 30
}
```

Preferencias configurables:

```http
GET /api/profile/email-preferences
PATCH /api/profile/email-preferences
```

```json
{
  "notifyDeposits": true,
  "notifyTransfersSent": true,
  "notifyTransfersReceived": true,
  "notifyExchanges": true,
  "notifyLoginDashboardReminder": true
}
```

La cola utiliza deduplicación, bloqueo con `FOR UPDATE SKIP LOCKED`, recuperación de trabajos bloqueados y reintentos exponenciales. Un error de AWS SES no revierte una transferencia, depósito o intercambio ya confirmado; el correo queda pendiente para un nuevo intento.
