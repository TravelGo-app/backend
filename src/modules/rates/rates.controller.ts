import type { Request, Response } from "express";
import {
  getRatePair,
  getRates,
} from "./rates.service.js";

function getSingleParam(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value[0];

    return typeof firstValue === "string"
      ? firstValue
      : "";
  }

  return "";
}

export async function getRatesController(
  req: Request,
  res: Response
): Promise<void> {
  const base =
    getSingleParam(req.query.base) || "ARS";

  const result = await getRates(base);

  res.status(200).json(result);
}

export async function getRatePairController(
  req: Request,
  res: Response
): Promise<void> {
  const base = getSingleParam(req.params.base);
  const target = getSingleParam(req.params.target);

  const result = await getRatePair(
    base,
    target
  );

  res.status(200).json(result);
}

