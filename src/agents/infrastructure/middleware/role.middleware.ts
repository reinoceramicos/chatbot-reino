import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import { AgentRole } from "../../domain/entities/agent.entity";

/**
 * Middleware para verificar roles mínimos requeridos
 * La jerarquía es: SELLER < MANAGER < ZONE_SUPERVISOR < REGIONAL_MANAGER
 */
const roleHierarchy: Record<AgentRole, number> = {
  SELLER: 1,
  MANAGER: 2,
  ZONE_SUPERVISOR: 3,
  REGIONAL_MANAGER: 4,
};

/**
 * Verifica si el usuario tiene al menos el rol mínimo requerido
 */
export const requireRole = (...allowedRoles: AgentRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.agent) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const userRole = req.agent.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({ error: "No tienes permisos para acceder a este recurso" });
      return;
    }

    next();
  };
};

/**
 * Verifica si el usuario tiene un rol igual o superior al mínimo requerido
 */
export const requireMinRole = (minRole: AgentRole) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.agent) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const userRole = req.agent.role;

    if (!userRole || roleHierarchy[userRole] < roleHierarchy[minRole]) {
      res.status(403).json({ error: "No tienes permisos para acceder a este recurso" });
      return;
    }

    next();
  };
};

/**
 * Solo permite acceso a REGIONAL_MANAGER
 */
export const requireRegionalManager = requireRole("REGIONAL_MANAGER");

/**
 * Permite acceso a ZONE_SUPERVISOR y superior
 */
export const requireZoneSupervisorOrAbove = requireMinRole("ZONE_SUPERVISOR");

/**
 * Permite acceso a MANAGER y superior
 */
export const requireManagerOrAbove = requireMinRole("MANAGER");

/**
 * Permite acceso a cualquier rol autenticado
 */
export const requireAnySeller = requireMinRole("SELLER");
