import { Pool } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on("error", (error) => {
  console.error("Error inesperado de PostgreSQL:", error);
});

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function waitForDatabase(
  maxAttempts = 10,
  delayMs = 3000
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query("SELECT 1");

      console.log("PostgreSQL disponible");
      return;
    } catch (error) {
      const databaseError = error as { code?: string; message?: string };

      console.error(
        `PostgreSQL no disponible. Intento ${attempt}/${maxAttempts}:`,
        databaseError.code ?? databaseError.message
      );

      if (attempt === maxAttempts) {
        throw error;
      }

      await delay(delayMs);
    }
  }
}