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

async function migrate() {
  try {
    const schemaUrl = new URL(
      "../src/migrations/schema.sql",
      import.meta.url
    );

    const sql = await readFile(schemaUrl, "utf8");

    await pool.query(sql);

    console.log("Migración ejecutada correctamente");
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Error ejecutando migración:", error);
  process.exit(1);
});