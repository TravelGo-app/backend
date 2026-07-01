import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

type JwtPayload = {
  userId: string;
  email: string;
};

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}