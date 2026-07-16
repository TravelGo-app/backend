import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectWithRetry } from "./db/pool.js";
import {
  startEmailOutboxWorker,
  stopEmailOutboxWorker,
} from "./modules/email-outbox/email-outbox.worker.js";

async function startServer(): Promise<void> {
  try {
    await connectWithRetry();
    await startEmailOutboxWorker();

    const server = app.listen(env.port, "0.0.0.0", () => {
      console.log(`TravelGo corre en el puerto ${env.port}`);
    });

    const shutdown = () => {
      stopEmailOutboxWorker();
      server.close(() => {
        process.exit(0);
      });
    };

    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

void startServer();