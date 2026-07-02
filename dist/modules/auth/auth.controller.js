import { AppError } from "../../utils/AppError.js";
import { getCurrentUser, loginUser, registerUser, } from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
export async function registerController(req, res) {
    const parsedBody = registerSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const message = parsedBody.error.issues[0]?.message ?? "Datos inválidos";
        throw new AppError(message, 400);
    }
    const result = await registerUser(parsedBody.data);
    res.status(201).json({
        message: "Usuario registrado correctamente",
        ...result,
    });
}
export async function loginController(req, res) {
    const parsedBody = loginSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const message = parsedBody.error.issues[0]?.message ?? "Datos inválidos";
        throw new AppError(message, 400);
    }
    const result = await loginUser(parsedBody.data);
    res.status(200).json({
        message: "Inicio de sesión correcto",
        ...result,
    });
}
export async function meController(req, res) {
    if (!req.user) {
        throw new AppError("Usuario no autenticado", 401);
    }
    const user = await getCurrentUser(req.user.userId);
    res.status(200).json({
        user,
    });
}
