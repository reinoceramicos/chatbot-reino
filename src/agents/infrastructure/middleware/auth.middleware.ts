import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { envConfig } from "../../../shared/config/env.config";
import { TokenPayload } from "../../domain/ports/auth.port";

export interface AuthenticatedRequest extends Request {
  agent?: TokenPayload;
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token no proporcionado" });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, envConfig.jwt.secret) as TokenPayload;
    req.agent = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};

export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, envConfig.jwt.secret) as TokenPayload;
      req.agent = decoded;
    } catch {
      // Token inválido, pero no es obligatorio
    }
  }

  next();
};
