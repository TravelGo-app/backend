import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { authMiddleware } from "../../src/middlewares/auth.middleware.js";
import { errorMiddleware } from "../../src/middlewares/error.middleware.js";
import { AppError } from "../../src/utils/AppError.js";
import { asyncHandler } from "../../src/utils/asyncHandler.js";
import { generateToken, verifyToken } from "../../src/utils/jwt.js";

describe("AppError", () => {
  it("conserva mensaje y status", () => {
    const error = new AppError("No autorizado", 401);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("No autorizado");
    expect(error.statusCode).toBe(401);
  });

  it("usa status 500 por defecto", () => {
    expect(new AppError("Error").statusCode).toBe(500);
  });
});

describe("JWT", () => {
  it("genera y verifica un token TravelGo", () => {
    const payload = { userId: "user-1", email: "user@travelgo.com" };
    const token = generateToken(payload);
    expect(verifyToken(token)).toMatchObject(payload);
  });

  it("rechaza un token alterado", () => {
    const token = generateToken({
      userId: "user-1",
      email: "user@travelgo.com",
    });
    expect(() => verifyToken(`${token}alterado`)).toThrow();
  });
});

describe("authMiddleware", () => {
  it("rechaza cuando falta Authorization", () => {
    const req = { headers: {} } as Request;
    expect(() => authMiddleware(req, {} as Response, vi.fn())).toThrowError(
      "Token no proporcionado",
    );
  });

  it("rechaza formatos distintos de Bearer", () => {
    const req = {
      headers: { authorization: "Basic abc" },
    } as Request;
    expect(() => authMiddleware(req, {} as Response, vi.fn())).toThrowError(
      "Formato inválido",
    );
  });

  it("agrega req.user y llama next con un token válido", () => {
    const token = generateToken({
      userId: "user-1",
      email: "user@travelgo.com",
    });
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;
    const next = vi.fn();

    authMiddleware(req, {} as Response, next);

    expect(req.user).toMatchObject({
      userId: "user-1",
      email: "user@travelgo.com",
    });
    expect(next).toHaveBeenCalledOnce();
  });

  it("rechaza un token inválido", () => {
    const req = {
      headers: { authorization: "Bearer token-invalido" },
    } as Request;
    expect(() => authMiddleware(req, {} as Response, vi.fn())).toThrowError(
      "Token inválido o expirado",
    );
  });
});

describe("errorMiddleware", () => {
  function createResponse() {
    const response = {
      status: vi.fn(),
      json: vi.fn(),
    };
    response.status.mockReturnValue(response);
    return response;
  }

  it("serializa AppError", () => {
    const response = createResponse();

    errorMiddleware(
      new AppError("Recurso inexistente", 404),
      {} as Request,
      response as unknown as Response,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: "Recurso inexistente",
    });
  });

  it("oculta errores internos", () => {
    const response = createResponse();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    errorMiddleware(
      new Error("detalle privado"),
      {} as Request,
      response as unknown as Response,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: "Internal server error",
    });
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe("asyncHandler", () => {
  it("permite resolver un controlador", async () => {
    const next = vi.fn();
    const controller = vi.fn(async () => {});
    const wrapped = asyncHandler(controller);

    wrapped({} as Request, {} as Response, next as NextFunction);
    await Promise.resolve();
    await Promise.resolve();

    expect(controller).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  it("envía rechazos a next", async () => {
    const error = new Error("falló");
    const next = vi.fn();
    const wrapped = asyncHandler(async () => {
      throw error;
    });

    wrapped({} as Request, {} as Response, next as NextFunction);
    await Promise.resolve();
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith(error);
  });
});
