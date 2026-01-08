"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeolocationService = void 0;
class GeolocationService {
    stores = [];
    setStores(stores) {
        this.stores = stores.filter((s) => s.isActive);
    }
    getStores() {
        return this.stores;
    }
    /**
     * Calcula la distancia entre dos puntos usando la fórmula de Haversine
     * @returns Distancia en kilómetros
     */
    calculateDistance(point1, point2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRad(point2.latitude - point1.latitude);
        const dLon = this.toRad(point2.longitude - point1.longitude);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(point1.latitude)) *
                Math.cos(this.toRad(point2.latitude)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return Math.round(distance * 100) / 100; // Redondear a 2 decimales
    }
    toRad(deg) {
        return deg * (Math.PI / 180);
    }
    /**
     * Encuentra la tienda más cercana a las coordenadas dadas
     */
    findNearestStore(coordinates) {
        if (this.stores.length === 0) {
            return null;
        }
        let nearestStore = null;
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
    findNearestStores(coordinates, limit = 3) {
        const storesWithDistance = this.stores.map((store) => ({
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
    getStoresByZone() {
        const zonesMap = new Map();
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
    getAvailableZones() {
        const zones = new Set(this.stores.map((s) => s.zone));
        return Array.from(zones).sort();
    }
    /**
     * Obtiene las tiendas de una zona específica
     */
    getStoresInZone(zone) {
        return this.stores.filter((s) => s.zone === zone);
    }
    /**
     * Busca una tienda por su código
     */
    findStoreByCode(code) {
        return this.stores.find((s) => s.code === code);
    }
    /**
     * Busca una tienda por su ID
     */
    findStoreById(id) {
        return this.stores.find((s) => s.id === id);
    }
    /**
     * Parsea coordenadas de un mensaje de ubicación de WhatsApp
     */
    parseLocationMessage(locationData) {
        return {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
        };
    }
    /**
     * Valida si las coordenadas están dentro de la zona de cobertura (Buenos Aires)
     */
    isWithinCoverageArea(coordinates) {
        // Límites aproximados del área metropolitana de Buenos Aires
        const bounds = {
            minLat: -35.2,
            maxLat: -34.2,
            minLon: -59.2,
            maxLon: -57.8,
        };
        return (coordinates.latitude >= bounds.minLat &&
            coordinates.latitude <= bounds.maxLat &&
            coordinates.longitude >= bounds.minLon &&
            coordinates.longitude <= bounds.maxLon);
    }
}
exports.GeolocationService = GeolocationService;
