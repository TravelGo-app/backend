import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";

import { pool } from "./db/pool.js";
import { openApiDocument } from "./docs/openapi.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { ratesRoutes } from "./modules/rates/rates.routes.js";
import { walletRoutes } from "./modules/wallet/wallet.routes.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "TravelGo API funcionando",
    health: "/api/health",
    docs: "/api-docs",
    openApi: "/api-docs.json",
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      service: "TravelGo API",
      database: "connected",
    });
  } catch (error) {
    console.error(
      "Error en healthcheck de PostgreSQL:",
      error
    );

    res.status(503).json({
      status: "error",
      service: "TravelGo API",
      database: "unavailable",
    });
  }
});

app.get("/api-docs.json", (_req, res) => {
  res.status(200).json(openApiDocument);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    explorer: true,
    customSiteTitle: "TravelGo API",
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/rates", ratesRoutes);

app.use(errorMiddleware);