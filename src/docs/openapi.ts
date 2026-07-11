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
    {
      name: "Transactions",
      description:
        "Depósitos, transferencias e intercambios simulados",
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
          hasPassword: {
            type: "boolean",
            description:
              "Indica si la cuenta tiene acceso por email y contraseña",
          },
          hasGoogle: {
            type: "boolean",
            description:
              "Indica si la cuenta está vinculada con Google",
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

    "/api/chat": {
      post: {
        tags: ["Chat"],
        summary: "Enviar mensaje al asistente de TravelGo",
        description:
          "Mantiene contexto por sessionId en memoria del servidor durante 20 minutos. No persiste historial en base de datos.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sessionId", "message"],
                properties: {
                  sessionId: {
                    type: "string",
                    example: "chat-550e8400-e29b-41d4-a716-446655440000",
                  },
                  message: {
                    type: "string",
                    example: "¿Cómo hago una transferencia en TravelGo?",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Respuesta generada por Gemini",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reply: {
                      type: "string",
                      example: "Para hacer una transferencia en TravelGo, ingresá a la sección de transferencias...",
                    },
                  },
                },
              },
            },
          },
          "400": { description: "sessionId o message inválidos" },
          "500": { description: "Gemini no configurado o error al generar respuesta" },
        },
      },
    },


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
          "409": {
            description:
              "La cuenta fue creada con Google y todavía no tiene contraseña",
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


    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary:
          "Solicitar email para recuperar contraseña",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "usuario@ejemplo.com",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Solicitud procesada sin revelar si el email existe",
          },
          "400": {
            description: "Datos inválidos",
          },
        },
      },
    },

    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary:
          "Restablecer contraseña usando token de recuperación",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: {
                  token: {
                    type: "string",
                    description:
                      "Token recibido por email",
                    example:
                      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    minLength: 6,
                    maxLength: 72,
                    example: "NuevaClave123",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Contraseña actualizada correctamente",
          },
          "400": {
            description:
              "Token inválido, vencido o datos inválidos",
          },
        },
      },
    },

    "/api/auth/set-password": {
      post: {
        tags: ["Auth"],
        summary:
          "Configurar contraseña para una cuenta autenticada",
        description:
          "Permite que una cuenta creada inicialmente con Google también pueda iniciar sesión con email y contraseña.",
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["password"],
                properties: {
                  password: {
                    type: "string",
                    format: "password",
                    minLength: 6,
                    maxLength: 72,
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
              "Contraseña configurada correctamente",
          },
          "400": {
            description: "Contraseña inválida",
          },
          "401": {
            description: "JWT ausente o inválido",
          },
          "404": {
            description: "Usuario no encontrado",
          },
          "409": {
            description:
              "La cuenta ya tiene una contraseña configurada",
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

    "/api/transactions/deposit": {
      post: {
        tags: ["Transactions"],
        summary: "Realizar un depósito simulado",
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "currencyCode",
                  "amount",
                  "idempotencyKey",
                ],
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
                    example: "10000.00",
                  },
                  idempotencyKey: {
                    type: "string",
                    example:
                      "deposit-550e8400-e29b-41d4-a716-446655440000",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Depósito procesado",
          },
          "200": {
            description:
              "Reintento idempotente de un depósito ya procesado",
          },
          "400": {
            description: "Datos inválidos",
          },
          "401": {
            description: "JWT ausente o inválido",
          },
          "409": {
            description: "Conflicto de operación",
          },
        },
      },
    },

    "/api/transactions/transfer": {
      post: {
        tags: ["Transactions"],
        summary: "Transferir fondos a otro usuario",
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "recipientEmail",
                  "currencyCode",
                  "amount",
                  "idempotencyKey",
                ],
                properties: {
                  recipientEmail: {
                    type: "string",
                    format: "email",
                    example: "destinatario@ejemplo.com",
                  },
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
                    example: "2500.00",
                  },
                  idempotencyKey: {
                    type: "string",
                    example:
                      "transfer-550e8400-e29b-41d4-a716-446655440000",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Transferencia procesada",
          },
          "200": {
            description:
              "Reintento idempotente de una transferencia ya procesada",
          },
          "400": {
            description: "Datos inválidos",
          },
          "401": {
            description: "JWT ausente o inválido",
          },
          "404": {
            description: "Destinatario no encontrado",
          },
          "409": {
            description:
              "Saldo insuficiente o conflicto de operación",
          },
        },
      },
    },

    "/api/transactions/exchange": {
      post: {
        tags: ["Transactions"],
        summary: "Intercambiar monedas dentro de la wallet",
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "fromCurrency",
                  "toCurrency",
                  "amount",
                  "idempotencyKey",
                ],
                properties: {
                  fromCurrency: {
                    type: "string",
                    enum: [
                      "ARS",
                      "USD",
                      "EUR",
                      "BRL",
                      "CLP",
                    ],
                  },
                  toCurrency: {
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
                    example: "50000.00",
                  },
                  idempotencyKey: {
                    type: "string",
                    example:
                      "exchange-550e8400-e29b-41d4-a716-446655440000",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Intercambio procesado",
          },
          "200": {
            description:
              "Reintento idempotente de un intercambio ya procesado",
          },
          "400": {
            description:
              "Datos o par de monedas inválidos",
          },
          "401": {
            description: "JWT ausente o inválido",
          },
          "409": {
            description:
              "Saldo insuficiente o conflicto de operación",
          },
          "502": {
            description:
              "No se pudo obtener la tasa de cambio",
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
