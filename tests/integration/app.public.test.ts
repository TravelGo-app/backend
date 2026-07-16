import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../../src/db/pool.js", () => ({
  pool: {
    query: mocks.query,
  },
}));

import { app } from "../../src/app.js";

describe("API pública TravelGo", () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it("responde el endpoint raíz", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "TravelGo API funcionando",
      health: "/api/health",
      docs: "/api-docs",
      openApi: "/api-docs.json",
    });
  });

  it("expone el documento OpenAPI", async () => {
    const response = await request(app).get("/api-docs.json");

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.info.title).toBe("TravelGo API");
  });

  it("informa health conectado cuando PostgreSQL responde", async () => {
    mocks.query.mockResolvedValue({ rows: [{ ok: 1 }] });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith("SELECT 1");
    expect(response.body).toEqual({
      status: "ok",
      service: "TravelGo API",
      database: "connected",
    });
  });

  it("informa 503 cuando PostgreSQL no responde", async () => {
    mocks.query.mockRejectedValue(new Error("database unavailable"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: "error",
      service: "TravelGo API",
      database: "unavailable",
    });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("habilita CORS para un origen permitido", async () => {
    const response = await request(app)
      .get("/")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
  });

  it("no habilita CORS para un origen desconocido", async () => {
    const response = await request(app)
      .get("/")
      .set("Origin", "https://origen-no-permitido.test");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("devuelve 404 para rutas inexistentes", async () => {
    const response = await request(app).get("/api/ruta-inexistente");
    expect(response.status).toBe(404);
  });
});
