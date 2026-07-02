import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("La variable DATABASE_URL no está configurada");
}

const pool = new Pool({
  connectionString: databaseUrl,
});

const TRANSIENT_ERROR_CODES = new Set([
  "57P03",
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "08P01",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
]);

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function runMigrationWithRetry(
  maxAttempts = 20,
  delayMs = 3000
) {
  const schemaUrl = new URL(
    "../src/migrations/schema.sql",
    import.meta.url
  );

  const sql = await readFile(schemaUrl, "utf8");
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query("SELECT 1");

      console.log("PostgreSQL disponible para migración");

      await pool.query(sql);

      console.log("Migración ejecutada correctamente");
      return;
    } catch (error) {
      lastError = error;

      const code = error?.code;
      const message = error?.message ?? "Error desconocido";

      console.error(
        `Intento de migración ${attempt}/${maxAttempts} falló:`,
        code ?? message
      );

      const retryable =
        !code || TRANSIENT_ERROR_CODES.has(code);

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      console.log(`Reintentando en ${delayMs}ms...`);
      await wait(delayMs);
    }
  }

  throw lastError;
}

async function main() {
  try {
    await runMigrationWithRetry();
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error definitivo ejecutando migración:", error);
  process.exit(1);
});