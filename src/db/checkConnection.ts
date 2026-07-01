import { pool } from "./pool.js";

async function checkConnection() {
  const result = await pool.query("SELECT NOW() AS current_time");

  console.log("Database connected successfully");
  console.log(result.rows[0]);

  await pool.end();
}

checkConnection().catch(async (error) => {
  console.error("Database connection failed:", error);
  await pool.end();
  process.exit(1);
});