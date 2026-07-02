import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";
export function authMiddleware(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new AppError("Token no proporcionado", 401);
    }
    const [type, token] = authHeader.split(" ");
    if (type !== "Bearer" || !token) {
        throw new AppError("Formato inválido", 401);
    }
    try {
        const payload = verifyToken(token);
        req.user = payload;
        next();
    }
    catch {
        throw new AppError("Token inválido o expirado", 401);
    }
}
