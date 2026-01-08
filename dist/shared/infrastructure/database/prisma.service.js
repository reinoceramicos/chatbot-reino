"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.disconnectPrisma = exports.getPrismaClient = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
// Singleton de PrismaClient para evitar múltiples conexiones
let prismaInstance = null;
let pool = null;
const getPrismaClient = () => {
    if (!prismaInstance) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error("DATABASE_URL is not defined");
        }
        pool = new pg_1.Pool({ connectionString });
        const adapter = new adapter_pg_1.PrismaPg(pool);
        prismaInstance = new client_1.PrismaClient({
            adapter,
            log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
        });
    }
    return prismaInstance;
};
exports.getPrismaClient = getPrismaClient;
// Para usar con async/await en el cierre de la aplicación
const disconnectPrisma = async () => {
    if (prismaInstance) {
        await prismaInstance.$disconnect();
        prismaInstance = null;
    }
    if (pool) {
        await pool.end();
        pool = null;
    }
};
exports.disconnectPrisma = disconnectPrisma;
// Instancia exportada para uso directo
exports.prisma = (0, exports.getPrismaClient)();
