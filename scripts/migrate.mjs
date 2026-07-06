import "dotenv/config";
import {
  readdir,
  readFile,
} from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "La variable DATABASE_URL no está configurada"
  );
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

const migrationsDirectory = new URL(
  "../src/migrations/",
  import.meta.url
);

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function sortMigrationFiles(
  firstFile,
  secondFile
) {
  if (firstFile === "schema.sql") {
    return -1;
  }

  if (secondFile === "schema.sql") {
    return 1;
  }

  return firstFile.localeCompare(secondFile);
}

async function runMigrations() {
  const migrationFiles = (
    await readdir(migrationsDirectory)
  )
    .filter((fileName) =>
      fileName.endsWith(".sql")
    )
    .sort(sortMigrationFiles);

  if (migrationFiles.length === 0) {
    throw new Error(
      "No se encontraron migraciones SQL"
    );
  }

  const client = await pool.connect();

  try {
    for (const fileName of migrationFiles) {
      const migrationUrl = new URL(
        fileName,
        migrationsDirectory
      );

      const sql = await readFile(
        migrationUrl,
        "utf8"
      );

      console.log(
        `Ejecutando migración: ${fileName}`
      );

      await client.query("BEGIN");

      try {
        await client.query(sql);
        await client.query("COMMIT");

        console.log(
          `Migración completada: ${fileName}`
        );
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
  }
}

async function runMigrationsWithRetry(
  maxAttempts = 20,
  delayMs = 3000
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt += 1
  ) {
    try {
      await pool.query("SELECT 1");

      console.log(
        "PostgreSQL disponible para migraciones"
      );

      await runMigrations();

      console.log(
        "Migraciones finalizadas correctamente"
      );

      return;
    } catch (error) {
      lastError = error;

      const code = error?.code;
      const message =
        error?.message ?? "Error desconocido";

      console.error(
        `Intento ${attempt}/${maxAttempts} falló:`,
        code ?? message
      );

      const retryable =
        typeof code === "string" &&
        TRANSIENT_ERROR_CODES.has(code);

      if (
        !retryable ||
        attempt === maxAttempts
      ) {
        throw error;
      }

      console.log(
        `Reintentando en ${delayMs}ms...`
      );

      await wait(delayMs);
    }
  }

  throw lastError;
}

async function main() {
  try {
    await runMigrationsWithRetry();
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    "Error definitivo ejecutando migraciones:",
    error
  );

  process.exit(1);
});