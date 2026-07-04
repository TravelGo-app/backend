# TravelGo Backend

Backend de **TravelGo**, una billetera digital multi-moneda desarrollada para el Proyecto Final de Henry.

Permite registrar usuarios, iniciar sesión, administrar wallets, consultar balances y obtener tasas de cambio. Todas las operaciones son simuladas y no utilizan dinero real.

## Estado actual

- Backend desarrollado con Express y TypeScript.
- PostgreSQL configurado localmente y en producción.
- API desplegada en Railway.
- Migraciones SQL automatizadas.
- Registro y login con JWT.
- Rutas privadas protegidas mediante middleware.
- Wallet creada automáticamente al registrar un usuario.
- Balances iniciales creados para cinco monedas.
- Consulta protegida de balances.
- Consulta pública de tasas de cambio.
- Cache de tasas almacenado en PostgreSQL.
- Build de TypeScript validado.

## Tecnologías

- Node.js
- Express
- TypeScript
- PostgreSQL
- pg
- JWT
- bcryptjs
- Zod
- dotenv
- cors
- tsx

## Estructura del proyecto

```txt
TravelGo-backend/
├── scripts/
│   └── migrate.mjs
├── src/
│   ├── config/
│   │   ├── currencies.ts
│   │   └── env.ts
│   ├── db/
│   │   ├── checkConnection.ts
│   │   └── pool.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── migrations/
│   │   └── schema.sql
│   ├── modules/
│   │   ├── auth/
│   │   ├── balances/
│   │   ├── rates/
│   │   └── wallet/
│   ├── types/
│   │   └── express.d.ts
│   ├── utils/
│   │   ├── AppError.ts
│   │   ├── asyncHandler.ts
│   │   └── jwt.ts
│   ├── app.ts
│   └── server.ts
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
Descripción de carpetas y archivos
scripts/migrate.mjs: ejecuta las migraciones SQL con reintentos de conexión.
src/config/: contiene variables de entorno y monedas soportadas.
src/db/: administra el pool de PostgreSQL y la prueba de conexión.
src/middlewares/: contiene autenticación JWT y manejo global de errores.
src/migrations/: contiene el schema y futuras migraciones de base de datos.
src/modules/auth/: registro, login, validaciones y consulta del usuario autenticado.
src/modules/balances/: acceso y creación de balances por moneda.
src/modules/wallet/: creación de wallets y consulta de balances.
src/modules/rates/: consulta externa y cache de tasas de cambio.
src/types/express.d.ts: agrega el usuario autenticado al tipo Request.
src/utils/: errores personalizados, JWT y helpers para rutas asíncronas.
src/app.ts: configura Express, middlewares, healthcheck y rutas.
src/server.ts: valida PostgreSQL e inicia el servidor.
dist/: contiene el código JavaScript compilado.
.env: guarda variables locales y no debe subirse a Git.
tsconfig.json: configura la compilación TypeScript.
package.json: contiene dependencias y scripts del proyecto.
Base de datos

La base de datos local se llama:

travelgo

Tablas principales:

users
wallets
balances
transactions
exchange_rates_cache
Usuarios

users almacena nombre, email, contraseña cifrada y fechas de creación y actualización.

Wallets

wallets representa la billetera asociada a cada usuario.

Cada usuario posee una única wallet.

Balances

balances guarda el saldo de cada moneda dentro de una wallet.

Monedas soportadas:

ARS
USD
EUR
BRL
CLP

Balances iniciales:

ARS = 100000
USD = 0
EUR = 0
BRL = 0
CLP = 0
Transacciones

transactions almacenará las operaciones simuladas:

BUY
SELL
EXCHANGE
Cache de tasas

exchange_rates_cache almacena tasas externas temporalmente para evitar consultas repetidas al proveedor.

Variables de entorno

Crear un archivo .env en la raíz:

PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:CONTRASEÑA@localhost:5432/travelgo
JWT_SECRET=clave_secreta
JWT_EXPIRES_IN=1d

Las variables reales de producción se configuran en Railway.

No se deben hardcodear secretos, URLs, credenciales ni configuraciones dependientes del entorno.

Scripts

Instalar dependencias:

npm install

Ejecutar migraciones:

npm run db:migrate

Comprobar PostgreSQL:

npm run db:check

Iniciar desarrollo:

npm run dev

Compilar TypeScript:

npm run build

Ejecutar la versión compilada:

npm start
Endpoints actuales
Estado del servidor
GET /api/health

Comprueba que la API y PostgreSQL estén disponibles.

Registro
POST /api/auth/register

Crea:

1 usuario
1 wallet
5 balances iniciales
Login
POST /api/auth/login

Valida las credenciales y devuelve un JWT.

Usuario autenticado
GET /api/auth/me

Requiere:

Authorization: Bearer TOKEN
Balances
GET /api/wallet/balances

Ruta protegida que devuelve la wallet y sus balances.

La ruta /api/balances no existe.

Tasas de cambio
GET /api/rates
GET /api/rates?base=USD
GET /api/rates/ARS/USD

Estas rutas son públicas y no requieren JWT.

Flujo actual validado
Usuario se registra
→ se cifra la contraseña
→ se crea su wallet
→ se crean cinco balances
→ inicia sesión
→ recibe un JWT
→ consulta su usuario
→ consulta sus balances
→ consulta tasas de cambio
Pruebas antes de producción

Todo cambio se prueba primero localmente:

npm run db:migrate
npm run build
npm run dev
git status
git diff

Después se realiza commit, push, merge a main, redeploy en Railway y prueba sobre la URL pública.

Próximos pasos
Implementar compra, venta e intercambio de monedas.
Registrar historial de transacciones.
Agregar autenticación con Google.
Incorporar emails de confirmación.
Agregar pruebas automatizadas.