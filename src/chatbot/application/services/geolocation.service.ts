export interface Store {
  id: string;
  code: string;
  name: string;
  address: string;
  zone: string;
  latitude: number;
  longitude: number;
  googleMapsUrl?: string;
  phone?: string;
  isActive: boolean;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface StoreWithDistance extends Store {
  distance: number; // km
}

export interface StoresByZone {
  zone: string;
  stores: Store[];
}

export class GeolocationService {
  private stores: Store[] = [];

  setStores(stores: Store[]): void {
    this.stores = stores.filter((s) => s.isActive);
  }

  getStores(): Store[] {
    return this.stores;
  }

  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine
   * @returns Distancia en kilómetros
   */
  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.latitude)) *
        Math.cos(this.toRad(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Redondear a 2 decimales
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Encuentra la tienda más cercana a las coordenadas dadas
   */
  findNearestStore(coordinates: Coordinates): StoreWithDistance | null {
    if (this.stores.length === 0) {
      return null;
    }

    let nearestStore: StoreWithDistance | null = null;
    let minDistance = Infinity;

    for (const store of this.stores) {
      const distance = this.calculateDistance(coordinates, {
        latitude: store.latitude,
        longitude: store.longitude,
      });

      if (distance < minDistance) {
        minDistance = distance;
        nearestStore = { ...store, distance };
      }
    }

    return nearestStore;
  }

  /**
   * Encuentra las N tiendas más cercanas
   */
  findNearestStores(coordinates: Coordinates, limit: number = 3): StoreWithDistance[] {
    const storesWithDistance: StoreWithDistance[] = this.stores.map((store) => ({
      ...store,
      distance: this.calculateDistance(coordinates, {
        latitude: store.latitude,
        longitude: store.longitude,
      }),
    }));

    return storesWithDistance.sort((a, b) => a.distance - b.distance).slice(0, limit);
  }

  /**
   * Agrupa las tiendas por zona para selección manual
   */
  getStoresByZone(): StoresByZone[] {
    const zonesMap = new Map<string, Store[]>();

    for (const store of this.stores) {
      const stores = zonesMap.get(store.zone) || [];
      stores.push(store);
      zonesMap.set(store.zone, stores);
    }

    return Array.from(zonesMap.entries())
      .map(([zone, stores]) => ({ zone, stores }))
      .sort((a, b) => a.zone.localeCompare(b.zone));
  }

  /**
   * Obtiene las zonas disponibles (únicas)
   */
  getAvailableZones(): string[] {
    const zones = new Set(this.stores.map((s) => s.zone));
    return Array.from(zones).sort();
  }

  /**
   * Obtiene las tiendas de una zona específica
   */
  getStoresInZone(zone: string): Store[] {
    return this.stores.filter((s) => s.zone === zone);
  }

  /**
   * Busca una tienda por su código
   */
  findStoreByCode(code: string): Store | undefined {
    return this.stores.find((s) => s.code === code);
  }

  /**
   * Busca una tienda por su ID
   */
  findStoreById(id: string): Store | undefined {
    return this.stores.find((s) => s.id === id);
  }

  /**
   * Parsea coordenadas de un mensaje de ubicación de WhatsApp
   */
  parseLocationMessage(locationData: { latitude: number; longitude: number }): Coordinates {
    return {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
    };
  }

  /**
   * Valida si las coordenadas están dentro de la zona de cobertura (Buenos Aires)
   */
  isWithinCoverageArea(coordinates: Coordinates): boolean {
    // Límites aproximados del área metropolitana de Buenos Aires
    const bounds = {
      minLat: -35.2,
      maxLat: -34.2,
      minLon: -59.2,
      maxLon: -57.8,
    };

    return (
      coordinates.latitude >= bounds.minLat &&
      coordinates.latitude <= bounds.maxLat &&
      coordinates.longitude >= bounds.minLon &&
      coordinates.longitude <= bounds.maxLon
    );
  }
}
