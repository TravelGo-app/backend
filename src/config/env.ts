import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing environment variable: ${envVar}`
    );
  }
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv:
    process.env.NODE_ENV || "development",
  databaseUrl:
    process.env.DATABASE_URL as string,
  jwtSecret:
    process.env.JWT_SECRET as string,
  jwtExpiresIn:
    process.env.JWT_EXPIRES_IN || "1d",
  googleClientId:
    process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
  emailEnabled:
    process.env.EMAIL_ENABLED === "true",
  awsRegion:
    process.env.AWS_REGION?.trim() ?? "",
  awsSesFromEmail:
    process.env.AWS_SES_FROM_EMAIL?.trim() ?? "",
};