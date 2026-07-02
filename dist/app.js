import express from "express";
import cors from "cors";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
export const app = express();
app.use(cors());
app.use(express.json());
app.get("/api/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        service: "TravelGo API",
        database: "connected",
    });
});
app.use("/api/auth", authRoutes);
app.use(errorMiddleware);
