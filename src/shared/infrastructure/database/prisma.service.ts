import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Singleton de PrismaClient para evitar múltiples conexiones
let prismaInstance: PrismaClient | null = null;
let pool: Pool | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (!prismaInstance) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is not defined");
    }

    pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    prismaInstance = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return prismaInstance;
};

// Para usar con async/await en el cierre de la aplicación
export const disconnectPrisma = async (): Promise<void> => {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
};

// Instancia exportada para uso directo
export const prisma = getPrismaClient();
