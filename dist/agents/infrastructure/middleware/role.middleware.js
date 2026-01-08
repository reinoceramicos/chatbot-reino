"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAnySeller = exports.requireManagerOrAbove = exports.requireZoneSupervisorOrAbove = exports.requireRegionalManager = exports.requireMinRole = exports.requireRole = void 0;
/**
 * Middleware para verificar roles mínimos requeridos
 * La jerarquía es: SELLER < MANAGER < ZONE_SUPERVISOR < REGIONAL_MANAGER
 */
const roleHierarchy = {
    SELLER: 1,
    MANAGER: 2,
    ZONE_SUPERVISOR: 3,
    REGIONAL_MANAGER: 4,
};
/**
 * Verifica si el usuario tiene al menos el rol mínimo requerido
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
/**
 * Verifica si el usuario tiene un rol igual o superior al mínimo requerido
 */
const requireMinRole = (minRole) => {
    return (req, res, next) => {
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
exports.requireMinRole = requireMinRole;
/**
 * Solo permite acceso a REGIONAL_MANAGER
 */
exports.requireRegionalManager = (0, exports.requireRole)("REGIONAL_MANAGER");
/**
 * Permite acceso a ZONE_SUPERVISOR y superior
 */
exports.requireZoneSupervisorOrAbove = (0, exports.requireMinRole)("ZONE_SUPERVISOR");
/**
 * Permite acceso a MANAGER y superior
 */
exports.requireManagerOrAbove = (0, exports.requireMinRole)("MANAGER");
/**
 * Permite acceso a cualquier rol autenticado
 */
exports.requireAnySeller = (0, exports.requireMinRole)("SELLER");
