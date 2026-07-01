# TravelGo Backend

Backend inicial del proyecto de billetera digital multi-moneda para el Proyecto Final de Henry.

El objetivo del backend es permitir la gestión de usuarios, wallets, balances por moneda, transacciones simuladas de compra/venta/intercambio y cache de tasas de cambio.

## Estado actual del proyecto

Hasta el momento se realizó la configuración inicial de la base de datos PostgreSQL y la conexión desde Node.js/TypeScript.

### Avances completados

* Base de datos PostgreSQL creada localmente.
* Base llamada `travelgo`.
* Archivo SQL de estructura creado en `src/migrations/schema.sql`.
* Migración ejecutada correctamente sobre la base `travelgo`.
* Tablas principales creadas:

  * `users`
  * `wallets`
  * `balances`
  * `transactions`
  * `exchange_rates_cache`
* Conexión entre Node.js y PostgreSQL validada correctamente.
* Variables de entorno configuradas mediante `.env`.
* Script `db:check` creado para probar la conexión con la base de datos.

## Tecnologías actuales

* Node.js
* TypeScript
* PostgreSQL
* pg
* dotenv
* tsx

## Estructura actual

```txt
TravelGo-backend/
├─ src/
│  ├─ config/
│  │  └─ env.ts
│  ├─ db/
│  │  ├─ pool.ts
│  │  └─ checkConnection.ts
│  └─ migrations/
│     └─ schema.sql
├─ .env
├─ package.json
├─ package-lock.json
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

Para listar tablas dentro de PostgreSQL:

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

## Archivo de schema

El archivo SQL principal está ubicado en:

```txt
src/migrations/schema.sql
```

Este archivo crea:

* Extensión `pgcrypto`
* Tabla `users`
* Tabla `wallets`
* Tabla `balances`
* Tabla `transactions`
* Tabla `exchange_rates_cache`
* Índices principales para mejorar consultas

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

## Scripts disponibles

### Probar conexión con PostgreSQL

```bash
npm run db:check
```

Resultado esperado:

```txt
Database connected successfully
{ current_time: ... }
```

## Resultado actual validado

La conexión fue probada correctamente con:

```bash
npm run db:check
```

Resultado obtenido:

```txt
Database connected successfully
{ current_time: 2026-07-01T21:36:33.347Z }
```

Esto confirma que:

* PostgreSQL está funcionando.
* La base `travelgo` existe.
* El backend puede conectarse a la base usando `DATABASE_URL`.
* La configuración de entorno está cargando correctamente.

## Dependencias actuales

```json
{
  "dependencies": {
    "dotenv": "^17.4.2",
    "pg": "^8.22.0"
  },
  "devDependencies": {
    "@types/pg": "^8.20.0",
    "tsx": "^4.22.4",
    "typescript": "^6.0.3"
  }
}
```

## Próximos pasos

El siguiente paso del desarrollo será implementar el módulo de autenticación.

Orden recomendado:

1. Crear servidor Express básico.
2. Crear endpoint `/api/health`.
3. Crear módulo `auth`.
4. Implementar `POST /api/auth/register`.
5. Al registrar usuario:

   * Crear usuario en `users`.
   * Crear wallet en `wallets`.
   * Crear balances iniciales en `balances`.
6. Implementar `POST /api/auth/login`.
7. Generar JWT.
8. Proteger rutas privadas.
9. Crear endpoint para consultar balances.

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
