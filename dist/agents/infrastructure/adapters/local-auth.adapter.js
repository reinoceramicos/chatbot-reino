"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalAuthAdapter = void 0;
const bcrypt = __importStar(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
const env_config_1 = require("../../../shared/config/env.config");
const SALT_ROUNDS = 10;
/**
 * Implementación local de autenticación usando JWT
 *
 * Esta implementación puede ser reemplazada por un MicroserviceAuthAdapter
 * cuando el microservicio de autenticación centralizado esté disponible.
 *
 * Para migrar:
 * 1. Crear MicroserviceAuthAdapter que implemente AuthPort
 * 2. Cambiar la inyección de dependencias en agent.routes.ts
 */
class LocalAuthAdapter {
    agentRepository;
    jwtSecret;
    jwtExpiresIn;
    constructor(agentRepository) {
        this.agentRepository = agentRepository;
        this.jwtSecret = env_config_1.envConfig.jwt.secret;
        this.jwtExpiresIn = env_config_1.envConfig.jwt.expiresIn;
    }
    async hashPassword(password) {
        return bcrypt.hash(password, SALT_ROUNDS);
    }
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    generateToken(agentId, email, role, storeId, zoneId) {
        const payload = {
            agentId,
            email,
            role,
            storeId,
            zoneId,
        };
        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiresIn,
        });
    }
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        }
        catch {
            return null;
        }
    }
    async login(email, password) {
        const agent = await this.agentRepository.findByEmail(email);
        if (!agent) {
            return { success: false, error: "Credenciales incorrectas" };
        }
        if (!agent.password) {
            return { success: false, error: "Usuario sin contraseña configurada" };
        }
        const validPassword = await this.verifyPassword(password, agent.password);
        if (!validPassword) {
            return { success: false, error: "Credenciales incorrectas" };
        }
        // Actualizar último login y estado
        await this.agentRepository.updateLastLogin(agent.id);
        await this.agentRepository.updateStatus(agent.id, "AVAILABLE");
        const token = this.generateToken(agent.id, agent.email, agent.role, agent.storeId, agent.zoneId);
        return {
            success: true,
            token,
            agent: {
                id: agent.id,
                name: agent.name,
                email: agent.email,
                role: agent.role,
                storeId: agent.storeId,
                zoneId: agent.zoneId,
                status: "AVAILABLE",
            },
        };
    }
    async logout(agentId) {
        await this.agentRepository.updateStatus(agentId, "OFFLINE");
    }
    async register(data) {
        const existing = await this.agentRepository.findByEmail(data.email);
        if (existing) {
            return { success: false, error: "El email ya está registrado" };
        }
        const hashedPassword = await this.hashPassword(data.password);
        const role = data.role || "SELLER";
        const agent = await this.agentRepository.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role,
            storeId: data.storeId,
            zoneId: data.zoneId,
            status: "OFFLINE",
            maxConversations: 5,
            activeConversations: 0,
        });
        const token = this.generateToken(agent.id, agent.email, agent.role, agent.storeId, agent.zoneId);
        return {
            success: true,
            token,
            agent: {
                id: agent.id,
                name: agent.name,
                email: agent.email,
                role: agent.role,
                storeId: agent.storeId,
                zoneId: agent.zoneId,
                status: agent.status,
            },
        };
    }
    async changePassword(agentId, currentPassword, newPassword) {
        const agent = await this.agentRepository.findById(agentId);
        if (!agent || !agent.password) {
            return false;
        }
        const validPassword = await this.verifyPassword(currentPassword, agent.password);
        if (!validPassword) {
            return false;
        }
        const hashedPassword = await this.hashPassword(newPassword);
        await this.agentRepository.update(agentId, { password: hashedPassword });
        return true;
    }
}
exports.LocalAuthAdapter = LocalAuthAdapter;
