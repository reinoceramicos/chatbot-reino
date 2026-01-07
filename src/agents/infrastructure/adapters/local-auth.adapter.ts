import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import {
  AuthPort,
  LoginResult,
  TokenPayload,
  RegisterData,
} from "../../domain/ports/auth.port";
import { AgentRepository } from "../../domain/ports/agent.repository.port";
import { AgentRole } from "../../domain/entities/agent.entity";
import { envConfig } from "../../../shared/config/env.config";

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
export class LocalAuthAdapter implements AuthPort {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor(private readonly agentRepository: AgentRepository) {
    this.jwtSecret = envConfig.jwt.secret;
    this.jwtExpiresIn = envConfig.jwt.expiresIn;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(agentId: string, email: string, role: AgentRole, storeId?: string, zoneId?: string): string {
    const payload: TokenPayload = {
      agentId,
      email,
      role,
      storeId,
      zoneId,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
    } as jwt.SignOptions);
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch {
      return null;
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
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
    await this.agentRepository.updateLastLogin(agent.id!);
    await this.agentRepository.updateStatus(agent.id!, "AVAILABLE");

    const token = this.generateToken(agent.id!, agent.email!, agent.role, agent.storeId, agent.zoneId);

    return {
      success: true,
      token,
      agent: {
        id: agent.id!,
        name: agent.name,
        email: agent.email!,
        role: agent.role,
        storeId: agent.storeId,
        zoneId: agent.zoneId,
        status: "AVAILABLE",
      },
    };
  }

  async logout(agentId: string): Promise<void> {
    await this.agentRepository.updateStatus(agentId, "OFFLINE");
  }

  async register(data: RegisterData): Promise<LoginResult> {
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

    const token = this.generateToken(agent.id!, agent.email!, agent.role, agent.storeId, agent.zoneId);

    return {
      success: true,
      token,
      agent: {
        id: agent.id!,
        name: agent.name,
        email: agent.email!,
        role: agent.role,
        storeId: agent.storeId,
        zoneId: agent.zoneId,
        status: agent.status,
      },
    };
  }

  async changePassword(
    agentId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
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
