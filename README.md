# TravelGo Backend

Backend del proyecto **TravelGo**, una billetera digital multi-moneda desarrollada para el Proyecto Final de Henry.

El objetivo del backend es permitir la gestión de usuarios, wallets, balances por moneda, transacciones simuladas de compra, venta e intercambio de monedas, historial de operaciones y cache de tasas de cambio.

Todas las operaciones son simuladas. No se utiliza dinero real.

## Estado actual del proyecto

Hasta el momento se configuró la base inicial del backend:

* Base de datos PostgreSQL creada localmente.
* Base llamada `travelgo`.
* Archivo SQL de estructura creado en `src/migrations/schema.sql`.
* Tablas principales creadas correctamente.
* Conexión entre Node.js y PostgreSQL validada.
* Variables de entorno configuradas mediante `.env`.
* Script `db:check` creado para probar conexión con la base de datos.
* Servidor Express configurado.
* Endpoint `/api/health` funcionando.
* Configuración de TypeScript agregada.
* Build del backend validado correctamente.

## Tecnologías utilizadas

* Node.js
* Express.js
* TypeScript
* PostgreSQL
* pg
* dotenv
* tsx
* cors

## Estructura actual

```txt
TravelGo-backend/
├─ src/
│  ├─ config/
│  │  └─ env.ts
│  ├─ db/
│  │  ├─ pool.ts
│  │  └─ checkConnection.ts
│  ├─ middlewares/
│  │  └─ error.middleware.ts
│  ├─ migrations/
│  │  └─ schema.sql
│  ├─ utils/
│  │  └─ AppError.ts
│  ├─ app.ts
│  └─ server.ts
├─ .gitignore
├─ package.json
├─ package-lock.json
├─ tsconfig.json
└─ README.md
```

## Base de datos

La base de datos local se llama:

```txt
travelgo
```

Para conectarse manualmente:

```bash
psql -U postgres -d travelgo
```

Para listar las tablas dentro de PostgreSQL:

```sql
\dt
```

Tablas esperadas:

```txt
balances
exchange_rates_cache
transactions
users
wallets
```

## Tablas principales

### `users`

Guarda los datos principales de los usuarios registrados.

### `wallets`

Representa la billetera asociada a cada usuario.

### `balances`

Guarda el saldo disponible por moneda dentro de cada wallet.

Monedas iniciales previstas:

```txt
ARS
USD
EUR
BRL
CLP
```

### `transactions`

Registra las operaciones simuladas de compra, venta e intercambio de monedas.

Tipos de transacción previstos:

```txt
BUY
SELL
EXCHANGE
```

### `exchange_rates_cache`

Guarda tasas de cambio obtenidas desde una API externa para evitar consultas repetidas.

## Archivo de schema

El archivo SQL principal está ubicado en:

```txt
src/migrations/schema.sql
```

Este archivo crea:

* Extensión `pgcrypto`.
* Tabla `users`.
* Tabla `wallets`.
* Tabla `balances`.
* Tabla `transactions`.
* Tabla `exchange_rates_cache`.
* Índices principales para mejorar consultas.
* Constraints para validar monedas, montos y tipos de operación.

## Ejecutar el schema manualmente

Desde la raíz del proyecto:

```bash
psql -U postgres -d travelgo -f src/migrations/schema.sql
```

Si se ejecuta correctamente, PostgreSQL debería mostrar mensajes similares a:

```txt
CREATE EXTENSION
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
```

## Variables de entorno

El proyecto usa un archivo `.env` en la raíz.

Ejemplo:

```env
PORT=3000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/travelgo

JWT_SECRET=super_secret_dev_key
JWT_EXPIRES_IN=1d
```

Importante: reemplazar `TU_PASSWORD` por la contraseña real del usuario `postgres`.

El archivo `.env` no debe subirse al repositorio.

## Scripts disponibles

### Ejecutar servidor en modo desarrollo

```bash
npm run dev
```

Resultado esperado:

```txt
TravelGo corre en el puerto 3000
```

### Probar endpoint de salud

Con el servidor levantado:

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "TravelGo API",
  "database": "connected"
}
```

### Probar conexión con PostgreSQL

```bash
npm run db:check
```

Resultado esperado:

```txt
Database connected successfully
{ current_time: ... }
```

### Compilar TypeScript

```bash
npm run build
```

Si no hay errores, se genera la carpeta:

```txt
dist/
```

### Ejecutar versión compilada

```bash
npm start
```

## Resultado actual validado

La conexión con PostgreSQL fue probada correctamente con:

```bash
npm run db:check
```

Resultado obtenido:

```txt
Database connected successfully
{ current_time: 2026-07-01T21:36:33.347Z }
```

El endpoint de salud fue probado correctamente con:

```bash
curl http://localhost:3000/api/health
```

Resultado obtenido:

```json
{
  "status": "ok",
  "service": "TravelGo API",
  "database": "connected"
}
```

El build de TypeScript fue validado correctamente con:

```bash
npm run build
```

Y se generó la carpeta:

```txt
dist/
```

## Dependencias actuales

```json
{
  "dependencies": {
    "cors": "...",
    "dotenv": "...",
    "express": "...",
    "pg": "..."
  },
  "devDependencies": {
    "@types/cors": "...",
    "@types/express": "...",
    "@types/node": "...",
    "@types/pg": "...",
    "tsx": "...",
    "typescript": "..."
  }
}
```

## Archivos ignorados por Git

El proyecto ignora archivos sensibles o generados automáticamente:

```gitignore
node_modules
dist
.env
coverage
.DS_Store
```

## Próximos pasos

El siguiente paso del desarrollo será implementar el módulo de autenticación.

Orden recomendado:

1. Crear módulo `auth`.
2. Implementar `POST /api/auth/register`.
3. Al registrar usuario:

   * Crear usuario en `users`.
   * Crear wallet en `wallets`.
   * Crear balances iniciales en `balances`.
4. Implementar `POST /api/auth/login`.
5. Generar JWT.
6. Proteger rutas privadas.
7. Crear endpoint para consultar balances.
8. Implementar lógica de compra, venta e intercambio de monedas.
9. Registrar historial de transacciones.
10. Agregar cache de tasas de cambio.
11. Integrar emails de confirmación.

## Flujo esperado del registro

Cuando un usuario se registre, el backend deberá crear automáticamente:

```txt
1 usuario
1 wallet asociada
5 balances iniciales
```

Balances iniciales propuestos:

```txt
ARS = 100000
USD = 0
EUR = 0
BRL = 0
CLP = 0
```

## Objetivo técnico inmediato

Lograr el siguiente flujo mínimo:

```txt
Usuario se registra
→ se crea su wallet
→ se crean sus balances iniciales
→ inicia sesión
→ recibe un token JWT
→ consulta sus balances
```

Una vez completado ese flujo, se avanzará con transacciones simuladas de compra, venta e intercambio de monedas.
/api/health es un endpoint simple para verificar que el backend está vivo y respondiendo.