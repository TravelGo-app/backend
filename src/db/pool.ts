import { Pool } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on("error", (error) => {
  console.error("Unexpected database error:", error);
});