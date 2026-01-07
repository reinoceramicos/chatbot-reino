import { AgentRole } from "../entities/agent.entity";

export interface AuthenticatedAgent {
  id: string;
  name: string;
  email: string;
  role: AgentRole;
  storeId?: string;
  zoneId?: string;
  status: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  agent?: AuthenticatedAgent;
  error?: string;
}

export interface TokenPayload {
  agentId: string;
  email: string;
  role: AgentRole;
  storeId?: string;
  zoneId?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: AgentRole;
  storeId?: string;
  zoneId?: string;
}

/**
 * Puerto de autenticación - Define el contrato para cualquier implementación de auth
 *
 * Implementaciones posibles:
 * - LocalAuthService: Autenticación local con JWT (actual)
 * - MicroserviceAuthAdapter: Delegará a un microservicio externo (futuro)
 * - OAuth2AuthAdapter: Para integración con proveedores OAuth (futuro)
 */
export interface AuthPort {
  /**
   * Autentica un agente con email y contraseña
   */
  login(email: string, password: string): Promise<LoginResult>;

  /**
   * Cierra la sesión del agente
   */
  logout(agentId: string): Promise<void>;

  /**
   * Registra un nuevo agente (puede ser deshabilitado en producción si el registro es centralizado)
   */
  register(data: RegisterData): Promise<LoginResult>;

  /**
   * Verifica y decodifica un token JWT
   * @returns TokenPayload si el token es válido, null si no lo es
   */
  verifyToken(token: string): TokenPayload | null;

  /**
   * Genera un nuevo token para un agente (usado internamente o para refresh)
   */
  generateToken(agentId: string, email: string, role: AgentRole, storeId?: string, zoneId?: string): string;

  /**
   * Cambia la contraseña de un agente
   */
  changePassword(agentId: string, currentPassword: string, newPassword: string): Promise<boolean>;
}
