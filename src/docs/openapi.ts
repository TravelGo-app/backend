export const openApiDocument = {
  openapi: "3.0.3",

  info: {
    title: "TravelGo API",
    version: "1.0.0",
    description:
      "API REST para una billetera digital multi-moneda. Todas las operaciones son simuladas.",
  },

  servers: [
    {
      url: "/",
      description: "Servidor actual",
    },
  ],

  tags: [
    {
      name: "Health",
      description: "Estado del backend y PostgreSQL",
    },
    {
      name: "Auth",
      description: "Registro e inicio de sesión",
    },
    {
      name: "Wallet",
      description: "Wallet y balances del usuario",
    },
    {
      name: "Rates",
      description: "Tasas públicas de cambio",
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },

    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
            example: "Credenciales inválidas",
          },
        },
      },

      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
            example: "Usuario Demo",
          },
          email: {
            type: "string",
            format: "email",
            example: "usuario@ejemplo.com",
          },
          avatarUrl: {
            type: "string",
            nullable: true,
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
        },
      },

      Balance: {
        type: "object",
        properties: {
          currencyCode: {
            type: "string",
            enum: [
              "ARS",
              "USD",
              "EUR",
              "BRL",
              "CLP",
            ],
          },
          amount: {
            type: "string",
            example: "100000.000000",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },

      Wallet: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          userId: {
            type: "string",
            format: "uuid",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
        },
      },

      AuthResponse: {
        type: "object",
        properties: {
          message: {
            type: "string",
          },
          user: {
            $ref: "#/components/schemas/User",
          },
          token: {
            type: "string",
            description: "JWT propio de TravelGo",
          },
        },
      },
    },
  },

  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Comprobar estado del backend",
        responses: {
          "200": {
            description:
              "Backend y PostgreSQL disponibles",
          },
          "503": {
            description:
              "PostgreSQL no está disponible",
          },
        },
      },
    },

    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Registrar usuario",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "name",
                  "email",
                  "password",
                ],
                properties: {
                  name: {
                    type: "string",
                    example: "Usuario Demo",
                  },
                  email: {
                    type: "string",
                    format: "email",
                    example: "usuario@ejemplo.com",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    example: "ClaveSegura123",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description:
              "Usuario, wallet y balances creados",
          },
          "400": {
            description: "Datos inválidos",
          },
          "409": {
            description:
              "El email ya está registrado",
          },
        },
      },
    },

    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary:
          "Iniciar sesión con email y contraseña",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "usuario@ejemplo.com",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    example: "ClaveSegura123",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Inicio de sesión correcto",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthResponse",
                },
              },
            },
          },
          "401": {
            description:
              "Credenciales inválidas",
          },
        },
      },
    },

    "/api/auth/google": {
      post: {
        tags: ["Auth"],
        summary: "Iniciar sesión con Google",
        description:
          "Recibe el ID token entregado por Google Identity Services.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["credential"],
                properties: {
                  credential: {
                    type: "string",
                    description:
                      "ID token firmado por Google",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Inicio de sesión con Google correcto",
          },
          "400": {
            description:
              "Credential ausente",
          },
          "401": {
            description:
              "Credential inválida o vencida",
          },
          "503": {
            description:
              "Google Login no está configurado",
          },
        },
      },
    },

    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary:
          "Obtener usuario autenticado",
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          "200": {
            description:
              "Datos del usuario autenticado",
          },
          "401": {
            description:
              "JWT ausente o inválido",
          },
        },
      },
    },

    "/api/wallet/balances": {
      get: {
        tags: ["Wallet"],
        summary:
          "Consultar wallet y balances",
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          "200": {
            description:
              "Wallet y balances del usuario",
          },
          "401": {
            description:
              "JWT ausente o inválido",
          },
          "404": {
            description:
              "Wallet no encontrada",
          },
        },
      },
    },

    "/api/rates": {
      get: {
        tags: ["Rates"],
        summary:
          "Obtener tasas de cambio",
        parameters: [
          {
            name: "base",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: [
                "ARS",
                "USD",
                "EUR",
                "BRL",
                "CLP",
              ],
              default: "ARS",
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Tasas obtenidas o recuperadas del cache",
          },
          "400": {
            description:
              "Moneda no soportada",
          },
        },
      },
    },

    "/api/rates/{base}/{target}": {
      get: {
        tags: ["Rates"],
        summary:
          "Consultar una tasa específica",
        parameters: [
          {
            name: "base",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: [
                "ARS",
                "USD",
                "EUR",
                "BRL",
                "CLP",
              ],
            },
          },
          {
            name: "target",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: [
                "ARS",
                "USD",
                "EUR",
                "BRL",
                "CLP",
              ],
            },
          },
        ],
        responses: {
          "200": {
            description:
              "Tasa del par solicitado",
          },
          "400": {
            description:
              "Par de monedas inválido",
          },
        },
      },
    },
  },
};