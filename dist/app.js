import express from "express";
import cors from "cors";
import { pool } from "./db/pool.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { walletRoutes } from "./modules/wallet/wallet.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
export const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (_req, res) => {
    res.status(200).json({
        message: "TravelGo API funcionando",
        health: "/api/health",
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
    }
    catch (error) {
        console.error("Error en healthcheck de PostgreSQL:", error);
        res.status(503).json({
            status: "error",
            service: "TravelGo API",
            database: "unavailable",
        });
    }
});
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use(errorMiddleware);
