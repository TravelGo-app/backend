import { AppError } from "../../utils/AppError.js";
import { getWalletBalances } from "./wallet.service.js";
export async function getBalancesController(req, res) {
    if (!req.user) {
        throw new AppError("Usuario no autenticado", 401);
    }
    const result = await getWalletBalances(req.user.userId);
    res.status(200).json(result);
}
