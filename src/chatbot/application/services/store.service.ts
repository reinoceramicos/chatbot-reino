import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../../shared/infrastructure/database/prisma.service";

export interface StoreInfo {
  code: string;
  name: string;
  address: string;
}

export interface ZoneInfo {
  code: string;
  name: string;
}

const ZONE_ID_TO_ZONE_NAME: Record<string, string[]> = {
  zone_caba_norte: ["CABA Norte", "Belgrano", "Palermo", "Núñez"],
  zone_caba_centro: ["CABA Centro", "Caballito", "Almagro", "Boedo"],
  zone_caba_oeste: ["CABA Oeste", "Flores", "Liniers", "Mataderos"],
  zone_norte_gba: [
    "Zona Norte",
    "Zona Norte GBA",
    "Vicente López",
    "San Isidro",
    "Tigre",
  ],
  zone_sur: [
    "Zona Sur",
    "Zona Sur GBA",
    "Quilmes",
    "Lanús",
    "Avellaneda",
    "Lomas",
  ],
  zone_oeste: [
    "Zona Oeste",
    "Zona Oeste GBA",
    "Morón",
    "San Justo",
    "Ituzaingó",
    "Merlo",
  ],
  zone_la_plata: ["La Plata"],
};

export class StoreService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Fetches active stores by zone ID (from flow selection)
   */
  async getStoresByZoneId(zoneId: string): Promise<StoreInfo[]> {
    const zoneNames = ZONE_ID_TO_ZONE_NAME[zoneId];

    if (!zoneNames || zoneNames.length === 0) {
      // If zone not mapped, return all active stores
      return this.getAllActiveStores();
    }

    const stores = await this.prisma.store.findMany({
      where: {
        isActive: true,
        zoneName: {
          in: zoneNames,
        },
      },
      select: {
        code: true,
        name: true,
        address: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // If no stores found for the zone, return all active stores as fallback
    if (stores.length === 0) {
      return this.getAllActiveStores();
    }

    return stores;
  }

  /**
   * Fetches all active stores
   */
  async getAllActiveStores(): Promise<StoreInfo[]> {
    const stores = await this.prisma.store.findMany({
      where: {
        isActive: true,
      },
      select: {
        code: true,
        name: true,
        address: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return stores;
  }

  /**
   * Gets a store by its code
   */
  async getStoreByCode(code: string): Promise<StoreInfo | null> {
    const store = await this.prisma.store.findFirst({
      where: {
        code,
        isActive: true,
      },
      select: {
        code: true,
        name: true,
        address: true,
      },
    });

    return store;
  }

  /**
   * Fetches stores by zone code (from database Zone table)
   */
  async getStoresByZone(zoneCode: string): Promise<StoreInfo[]> {
    // First try to find by zone relation
    const zone = await this.prisma.zone.findFirst({
      where: { code: zoneCode },
    });

    if (zone) {
      const stores = await this.prisma.store.findMany({
        where: {
          isActive: true,
          zoneId: zone.id,
        },
        select: {
          code: true,
          name: true,
          address: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      if (stores.length > 0) {
        return stores;
      }
    }

    // Fallback to zone ID mapping
    return this.getStoresByZoneId(`zone_${zoneCode.toLowerCase()}`);
  }

  /**
   * Alias for getAllActiveStores
   */
  async getAllStores(): Promise<StoreInfo[]> {
    return this.getAllActiveStores();
  }

  /**
   * Fetches all zones
   */
  async getAllZones(): Promise<ZoneInfo[]> {
    const zones = await this.prisma.zone.findMany({
      select: {
        code: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return zones;
  }
}

// Singleton instance
let storeServiceInstance: StoreService | null = null;

export function getStoreService(): StoreService {
  if (!storeServiceInstance) {
    storeServiceInstance = new StoreService();
  }
  return storeServiceInstance;
}
