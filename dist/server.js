import { app } from "./app.js";
import { env } from "./config/env.js";
import { waitForDatabase } from "./db/pool.js";
async function startServer() {
    try {
        await waitForDatabase();
        app.listen(env.port, "0.0.0.0", () => {
            console.log(`TravelGo corre en el puerto ${env.port}`);
        });
    }
    catch (error) {
        console.error("Error al iniciar TravelGo:", error);
        process.exit(1);
    }
}
void startServer();
