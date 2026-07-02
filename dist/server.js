import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectWithRetry } from "./db/pool.js";
async function startServer() {
    try {
        await connectWithRetry();
        app.listen(env.port, "0.0.0.0", () => {
            console.log(`TravelGo corre en el puerto ${env.port}`);
        });
    }
    catch (error) {
        console.error("Error al iniciar el servidor:", error);
        process.exit(1);
    }
}
void startServer();
