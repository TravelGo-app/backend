import dotenv from "dotenv";

dotenv.config();

function getEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function requireEnv(name: string): string {
  const value = getEnv(name);

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}`
    );
  }

  return value;
}

const nodeEnv =
  getEnv("NODE_ENV") || "development";

const emailEnabled =
  getEnv("EMAIL_ENABLED") === "true";

const googleAuthEnabled =
  getEnv("GOOGLE_AUTH_ENABLED") === "true";

const frontendOrigins = getEnv(
  "FRONTEND_ORIGINS"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const frontendUrl =
  getEnv("FRONTEND_URL") ||
  frontendOrigins[0] ||
  "http://localhost:5173";

const databaseUrl =
  requireEnv("DATABASE_URL");

const jwtSecret =
  requireEnv("JWT_SECRET");

if (emailEnabled) {
  requireEnv("AWS_REGION");
  requireEnv("AWS_SES_FROM_EMAIL");
}

if (googleAuthEnabled) {
  requireEnv("GOOGLE_CLIENT_ID");
}

export const env = {
  port: Number(getEnv("PORT")) || 3000,
  nodeEnv,
  databaseUrl,
  jwtSecret,
  jwtExpiresIn:
    getEnv("JWT_EXPIRES_IN") || "1d",

  frontendOrigins,
  frontendUrl,

  googleAuthEnabled,
  googleClientId:
    getEnv("GOOGLE_CLIENT_ID"),

  emailEnabled,
  awsRegion:
    getEnv("AWS_REGION"),
  awsSesFromEmail:
    getEnv("AWS_SES_FROM_EMAIL"),
};
