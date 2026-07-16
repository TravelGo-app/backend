import { describe, expect, it } from "vitest";

import { openApiDocument } from "../../src/docs/openapi.js";

describe("documento OpenAPI", () => {
  const document = openApiDocument as Record<string, any>;

  it("declara OpenAPI 3.0.3 e identidad TravelGo", () => {
    expect(document.openapi).toBe("3.0.3");
    expect(document.info).toMatchObject({
      title: "TravelGo API",
      version: "1.0.0",
    });
  });

  it("declara autenticación Bearer JWT", () => {
    expect(document.components.securitySchemes.bearerAuth).toEqual({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
  });

  it("documenta los dominios principales", () => {
    const tags = document.tags.map((tag: { name: string }) => tag.name);
    expect(tags).toEqual(
      expect.arrayContaining([
        "Health",
        "Auth",
        "Wallet",
        "Profile",
        "Activity History",
        "Rates",
        "Transactions",
      ]),
    );
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("contiene una colección amplia de endpoints", () => {
    expect(document.paths).toBeTypeOf("object");
    expect(Object.keys(document.paths).length).toBeGreaterThanOrEqual(10);
  });
});
