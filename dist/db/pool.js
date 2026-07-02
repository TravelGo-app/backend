import { Pool } from "pg";
import { env } from "../config/env.js";
export const pool = new Pool({
    connectionString: env.databaseUrl,
});
pool.on("error", (error) => {
    console.error("Error inesperado de PostgreSQL:", error);
});
function wait(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}
export async function connectWithRetry(retries = 20, delayMs = 3000) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const client = await pool.connect();
            try {
                await client.query("SELECT 1");
            }
            finally {
                client.release();
            }
            console.log("Database connected successfully");
            return;
        }
        catch (error) {
            lastError = error;
            const databaseError = error;
            console.log(`Database connection attempt ${attempt}/${retries} failed: ${databaseError.code ?? databaseError.message ?? "unknown error"}`);
            if (attempt < retries) {
                console.log(`Retrying in ${delayMs}ms...`);
                await wait(delayMs);
            }
        }
    }
    console.error("Último error de PostgreSQL:", lastError);
    throw new Error("Could not connect to database after multiple attempts");
}
