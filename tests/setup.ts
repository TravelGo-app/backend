process.env.NODE_ENV = "test";
process.env.PORT = "3001";
process.env.DATABASE_URL =
  "postgresql://travelgo_test:travelgo_test@127.0.0.1:5432/travelgo_test";
process.env.JWT_SECRET =
  "travelgo-test-secret-with-enough-entropy-for-deterministic-tests";
process.env.JWT_EXPIRES_IN = "1h";
process.env.FRONTEND_ORIGINS =
  "http://localhost:5173,https://travelgo.test";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.EMAIL_ENABLED = "false";
process.env.GOOGLE_AUTH_ENABLED = "false";
process.env.GEMINI_API_KEY = "";
