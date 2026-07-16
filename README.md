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
TravelGo-backend/                                      # Raíz del backend TravelGo
├── scripts/                                           # Automatizaciones ejecutadas fuera del código TypeScript
│   └── migrate.mjs                                    # Ejecuta schema.sql y las migraciones SQL en orden
├── src/                                               # Código fuente productivo del backend
│   ├── config/                                        # Configuración, catálogos y reglas compartidas
│   │   ├── currencies.ts                              # Monedas soportadas y validación de códigos monetarios
│   │   ├── env.ts                                     # Lectura y validación de variables de entorno y feature flags
│   │   └── transactions.ts                            # Tipos de transacción admitidos por TravelGo
│   ├── db/                                            # Infraestructura de acceso a PostgreSQL
│   │   ├── checkConnection.ts                         # Comprueba la conexión real con la base de datos
│   │   └── pool.ts                                    # Pool global de conexiones PostgreSQL
│   ├── dev/                                           # Herramientas disponibles únicamente en desarrollo
│   │   └── google-login-test.page.ts                  # Página local para probar Google Login y JWT
│   ├── docs/                                          # Documentación técnica generada por el backend
│   │   └── openapi.ts                                 # Contrato OpenAPI 3.0.3 utilizado por Swagger UI
│   ├── middlewares/                                   # Middlewares HTTP compartidos por Express
│   │   ├── auth.middleware.ts                         # Valida Bearer JWT y agrega el usuario autenticado al request
│   │   ├── email-availability-rate-limit.middleware.ts # Limita consultas repetidas de disponibilidad de email
│   │   └── error.middleware.ts                        # Centraliza respuestas de errores controlados e internos
│   ├── migrations/                                    # Esquema base y cambios SQL incrementales e idempotentes
│   │   ├── 002_google_auth.sql                        # Agrega soporte de autenticación mediante Google
│   │   ├── 003_transactions_operations.sql            # Incorpora operaciones, balances e idempotencia transaccional
│   │   ├── 004_auth_password_reset_tokens.sql          # Agrega tokens seguros para recuperación de contraseña
│   │   ├── 005_transaction_analytics_indexes.sql       # Crea índices para historial y analítica de transacciones
│   │   ├── 006_profile_travelgo_identifiers.sql        # Agrega datos de perfil, alias y CVU TravelGo
│   │   ├── 007_email_outbox_notifications.sql          # Crea outbox y preferencias para notificaciones por email
│   │   ├── 20260716_activity_history.sql               # Incorpora el historial unificado de actividad del usuario
│   │   └── schema.sql                                  # Define el esquema inicial completo de PostgreSQL
│   ├── modules/                                       # Funcionalidades organizadas por dominio de negocio
│   │   ├── activity-history/                          # Historial unificado de operaciones, seguridad y perfil
│   │   │   ├── activity-history.controller.ts         # Traduce requests HTTP en consultas de historial
│   │   │   ├── activity-history.repository.ts         # Ejecuta consultas SQL del historial de actividad
│   │   │   ├── activity-history.routes.ts             # Declara endpoints protegidos de historial
│   │   │   ├── activity-history.schemas.ts            # Valida filtros, cursor, categorías y estados
│   │   │   ├── activity-history.service.ts            # Aplica reglas y transforma eventos para la API
│   │   │   └── activity-history.types.ts              # Define categorías, estados y tipos del historial
│   │   ├── auth/                                      # Registro, login, Google Login, JWT y contraseñas
│   │   │   ├── auth.controller.ts                     # Controladores HTTP de autenticación
│   │   │   ├── auth.repository.ts                     # Persistencia SQL de usuarios y credenciales
│   │   │   ├── auth.routes.ts                         # Declara las rutas públicas y privadas de autenticación
│   │   │   ├── auth.schemas.ts                        # Valida registro, login, Google y recuperación
│   │   │   ├── auth.service.ts                        # Implementa reglas de autenticación y creación de cuentas
│   │   │   ├── google-auth.service.ts                 # Verifica credenciales de Google Identity Services
│   │   │   └── password-reset.repository.ts           # Persiste y consume tokens hasheados de recuperación
│   │   ├── balances/                                  # Persistencia y mantenimiento de saldos por moneda
│   │   │   └── balances.repository.ts                 # Crea, consulta y actualiza balances en PostgreSQL
│   │   ├── chat/                                      # Chatbot TravelGo integrado con Gemini
│   │   │   ├── chat.controller.ts                     # Procesa mensajes recibidos por la API de chat
│   │   │   ├── chat.memory.ts                         # Mantiene sesiones temporales con TTL e historial limitado
│   │   │   ├── chat.routes.ts                         # Declara el endpoint del chatbot
│   │   │   ├── chat.schemas.ts                        # Valida sessionId y contenido de mensajes
│   │   │   └── chat.service.ts                        # Construye el contexto y consulta el modelo Gemini
│   │   ├── email-outbox/                              # Entrega durable y desacoplada de notificaciones por email
│   │   │   ├── dashboard-summary.service.ts           # Genera el resumen periódico de actividad del dashboard
│   │   │   ├── email-notifications.service.ts         # Decide y encola notificaciones según preferencias
│   │   │   ├── email-outbox.repository.ts             # Persiste, reserva y actualiza trabajos de email
│   │   │   ├── email-outbox.worker.ts                 # Procesa reintentos y envíos pendientes del outbox
│   │   │   └── email-templates.ts                     # Construye plantillas HTML y texto para notificaciones
│   │   ├── profile/                                   # Datos personales, alias, CVU y preferencias del usuario
│   │   │   ├── email-change.repository.ts             # Persiste tokens de confirmación para cambio de email
│   │   │   ├── profile.controller.ts                  # Controladores HTTP del perfil y sus preferencias
│   │   │   ├── profile.repository.ts                  # Acceso SQL a datos de perfil e identificadores
│   │   │   ├── profile.routes.ts                      # Declara endpoints protegidos del perfil
│   │   │   ├── profile.schemas.ts                     # Valida nombre, teléfono, fecha, alias y preferencias
│   │   │   └── profile.service.ts                     # Implementa reglas de actualización y consulta del perfil
│   │   ├── rates/                                     # Tasas de cambio públicas y caché persistente
│   │   │   ├── rates.controller.ts                    # Controladores HTTP para consultar tasas
│   │   │   ├── rates.provider.ts                      # Cliente del proveedor externo de cotizaciones
│   │   │   ├── rates.repository.ts                    # Lee y guarda tasas en la caché PostgreSQL
│   │   │   ├── rates.routes.ts                        # Declara endpoints públicos de tasas
│   │   │   └── rates.service.ts                       # Normaliza cotizaciones y aplica la estrategia de caché
│   │   ├── transactions/                              # Depósitos, transferencias, exchanges e historial reciente
│   │   │   ├── transactions.controller.ts             # Controladores HTTP de operaciones financieras simuladas
│   │   │   ├── transactions.repository.ts             # Ejecuta operaciones SQL atómicas, locks e idempotencia
│   │   │   ├── transactions.routes.ts                 # Declara endpoints protegidos de transacciones
│   │   │   ├── transactions.schemas.ts                # Valida monedas, montos, destinatarios y claves idempotentes
│   │   │   └── transactions.service.ts                # Implementa reglas de negocio y consistencia transaccional
│   │   └── wallet/                                    # Wallet única y balances asociados al usuario
│   │       ├── wallet.controller.ts                   # Responde consultas HTTP de wallet y saldos
│   │       ├── wallet.repository.ts                   # Consulta la wallet y sus balances en PostgreSQL
│   │       ├── wallet.routes.ts                       # Declara endpoints protegidos de wallet
│   │       └── wallet.service.ts                      # Aplica reglas de consulta y normalización de balances
│   ├── scripts/                                       # Scripts TypeScript auxiliares y pruebas manuales
│   │   └── testTransactionEmail.ts                    # Ejecuta una prueba real de email transaccional con AWS SES
│   ├── services/                                      # Integraciones externas reutilizadas por los módulos
│   │   └── email.service.ts                           # Construye y envía emails mediante Amazon SES
│   ├── types/                                         # Extensiones globales de tipos de TypeScript
│   │   └── express.d.ts                               # Agrega req.user al tipo Request de Express
│   ├── utils/                                         # Utilidades técnicas compartidas
│   │   ├── AppError.ts                                # Error controlado con mensaje y código HTTP
│   │   ├── asyncHandler.ts                            # Propaga errores de controladores async a Express
│   │   ├── jwt.ts                                     # Genera y verifica JWT propios de TravelGo
│   │   └── password.ts                                # Funciones de hash y comparación segura de contraseñas
│   ├── app.ts                                         # Configura Express, CORS, Swagger, rutas y middlewares
│   └── server.ts                                      # Valida dependencias e inicia el servidor HTTP
├── tests/                                             # Suite automatizada determinística del backend
│   ├── integration/                                   # Pruebas de contratos HTTP con dependencias simuladas
│   │   └── app.public.test.ts                         # Valida raíz, health, OpenAPI, CORS y respuestas 404
│   ├── unit/                                          # Pruebas aisladas de reglas, schemas y utilidades
│   │   ├── auth.schemas.test.ts                       # Prueba validaciones y normalización de autenticación
│   │   ├── chat-activity.schemas.test.ts              # Prueba schemas de chat e historial de actividad
│   │   ├── chat-memory.test.ts                        # Prueba sesiones, TTL y límite de memoria del chatbot
│   │   ├── config.test.ts                             # Prueba monedas y tipos de transacciones soportados
│   │   ├── email-disabled.test.ts                     # Garantiza que los tests no envíen emails reales
│   │   ├── openapi.test.ts                            # Valida identidad, seguridad, tags y endpoints OpenAPI
│   │   ├── profile.schemas.test.ts                    # Prueba perfil, alias, fechas y preferencias
│   │   ├── transactions.schemas.test.ts               # Prueba depósitos, transferencias y exchanges
│   │   └── utils-middlewares.test.ts                  # Prueba JWT, errores, auth middleware y asyncHandler
│   └── setup.ts                                       # Define variables seguras y determinísticas para Vitest
├── .env.example                                       # Plantilla pública de variables de entorno requeridas
├── .gitignore                                         # Excluye secretos, dependencias y archivos generados
├── package-lock.json                                  # Fija versiones exactas de dependencias npm
├── package.json                                       # Declara scripts, dependencias y metadatos del backend
├── README.md                                          # Documentación principal y operativa del proyecto
├── tsconfig.json                                      # Configuración TypeScript para el build productivo
├── tsconfig.test.json                                 # Configuración TypeScript para código y tests
└── vitest.config.ts                                   # Configuración de Vitest, cobertura y archivos de prueba
```

> La estructura documenta archivos fuente, pruebas y configuración versionados. No incluye `.env`, `node_modules/`, `dist/`, `coverage/` ni backups locales porque son secretos, dependencias o artefactos generados.

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

<!-- TRAVELGO_AUTOMATED_TESTS_END -->

## Módulos principales

### Autenticación

El módulo `src/modules/auth/` gestiona:

- Registro tradicional con nombre, email, contraseña y fecha de nacimiento.
- Cifrado y comparación segura de contraseñas.
- Login tradicional y generación de JWT propios de TravelGo.
- Consulta de disponibilidad de email con rate limit.
- Login mediante Google Identity Services.
- Creación o reutilización de cuentas Google sin duplicar wallet ni balances.
- Recuperación de contraseña mediante tokens hasheados y con vencimiento.

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
