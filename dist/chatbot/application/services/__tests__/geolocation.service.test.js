"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const geolocation_service_1 = require("../geolocation.service");
const mockStores = [
    {
        id: "store-1",
        code: "REINO_1",
        name: "Reino 1 - Belgrano",
        address: "Av. Cabildo 2040, Belgrano, CABA",
        zone: "CABA Norte",
        latitude: -34.5614,
        longitude: -58.4537,
        isActive: true,
    },
    {
        id: "store-2",
        code: "REINO_2",
        name: "Reino 2 - Palermo",
        address: "Av. Santa Fe 4850, Palermo, CABA",
        zone: "CABA Norte",
        latitude: -34.5789,
        longitude: -58.4321,
        isActive: true,
    },
    {
        id: "store-3",
        code: "REINO_10",
        name: "Reino 10 - Quilmes",
        address: "Av. Calchaquí 800, Quilmes, Buenos Aires",
        zone: "Zona Sur",
        latitude: -34.7234,
        longitude: -58.2567,
        isActive: true,
    },
    {
        id: "store-4",
        code: "REINO_7",
        name: "Reino 7 - San Justo",
        address: "Av. Brigadier Juan M. de Rosas 3200, San Justo",
        zone: "Zona Oeste",
        latitude: -34.6812,
        longitude: -58.5567,
        isActive: true,
    },
    {
        id: "store-5",
        code: "REINO_99",
        name: "Reino 99 - Inactivo",
        address: "Test address",
        zone: "Test Zone",
        latitude: -34.5,
        longitude: -58.5,
        isActive: false,
    },
];
describe("GeolocationService", () => {
    let service;
    beforeEach(() => {
        service = new geolocation_service_1.GeolocationService();
        service.setStores(mockStores);
    });
    describe("setStores / getStores", () => {
        it("should set and get stores", () => {
            const stores = service.getStores();
            expect(stores.length).toBe(4); // Solo activas
        });
        it("should filter out inactive stores", () => {
            const stores = service.getStores();
            const inactiveStore = stores.find((s) => s.code === "REINO_99");
            expect(inactiveStore).toBeUndefined();
        });
    });
    describe("calculateDistance", () => {
        it("should calculate distance between two points", () => {
            const point1 = { latitude: -34.5614, longitude: -58.4537 };
            const point2 = { latitude: -34.5789, longitude: -58.4321 };
            const distance = service.calculateDistance(point1, point2);
            // Distancia aproximada entre Belgrano y Palermo ~2.5km
            expect(distance).toBeGreaterThan(2);
            expect(distance).toBeLessThan(4);
        });
        it("should return 0 for same coordinates", () => {
            const point = { latitude: -34.5614, longitude: -58.4537 };
            const distance = service.calculateDistance(point, point);
            expect(distance).toBe(0);
        });
        it("should calculate larger distances correctly", () => {
            // Belgrano (CABA) to Quilmes
            const belgrano = { latitude: -34.5614, longitude: -58.4537 };
            const quilmes = { latitude: -34.7234, longitude: -58.2567 };
            const distance = service.calculateDistance(belgrano, quilmes);
            // Distancia aproximada ~25km
            expect(distance).toBeGreaterThan(20);
            expect(distance).toBeLessThan(30);
        });
    });
    describe("findNearestStore", () => {
        it("should find the nearest store to given coordinates", () => {
            // Coordenadas cerca de Belgrano
            const coordinates = {
                latitude: -34.56,
                longitude: -58.45,
            };
            const nearest = service.findNearestStore(coordinates);
            expect(nearest).not.toBeNull();
            expect(nearest?.code).toBe("REINO_1"); // Belgrano
        });
        it("should find nearest store for different location", () => {
            // Coordenadas cerca de Quilmes
            const coordinates = {
                latitude: -34.72,
                longitude: -58.26,
            };
            const nearest = service.findNearestStore(coordinates);
            expect(nearest).not.toBeNull();
            expect(nearest?.code).toBe("REINO_10"); // Quilmes
        });
        it("should include distance in result", () => {
            const coordinates = {
                latitude: -34.56,
                longitude: -58.45,
            };
            const nearest = service.findNearestStore(coordinates);
            expect(nearest?.distance).toBeDefined();
            expect(nearest?.distance).toBeGreaterThanOrEqual(0);
        });
        it("should return null when no stores", () => {
            service.setStores([]);
            const nearest = service.findNearestStore({ latitude: -34.56, longitude: -58.45 });
            expect(nearest).toBeNull();
        });
    });
    describe("findNearestStores", () => {
        it("should find N nearest stores", () => {
            const coordinates = {
                latitude: -34.6,
                longitude: -58.45,
            };
            const nearest = service.findNearestStores(coordinates, 2);
            expect(nearest.length).toBe(2);
        });
        it("should return stores sorted by distance", () => {
            const coordinates = {
                latitude: -34.6,
                longitude: -58.45,
            };
            const nearest = service.findNearestStores(coordinates, 3);
            expect(nearest[0].distance).toBeLessThanOrEqual(nearest[1].distance);
            expect(nearest[1].distance).toBeLessThanOrEqual(nearest[2].distance);
        });
        it("should respect limit parameter", () => {
            const coordinates = {
                latitude: -34.6,
                longitude: -58.45,
            };
            const nearest = service.findNearestStores(coordinates, 1);
            expect(nearest.length).toBe(1);
        });
        it("should default to 3 stores", () => {
            const coordinates = {
                latitude: -34.6,
                longitude: -58.45,
            };
            const nearest = service.findNearestStores(coordinates);
            expect(nearest.length).toBe(3);
        });
    });
    describe("getStoresByZone", () => {
        it("should group stores by zone", () => {
            const storesByZone = service.getStoresByZone();
            expect(storesByZone.length).toBeGreaterThan(0);
        });
        it("should include zone name and stores array", () => {
            const storesByZone = service.getStoresByZone();
            storesByZone.forEach((group) => {
                expect(group.zone).toBeDefined();
                expect(Array.isArray(group.stores)).toBe(true);
                expect(group.stores.length).toBeGreaterThan(0);
            });
        });
        it("should group multiple stores in same zone", () => {
            const storesByZone = service.getStoresByZone();
            const cabaNote = storesByZone.find((g) => g.zone === "CABA Norte");
            expect(cabaNote).toBeDefined();
            expect(cabaNote?.stores.length).toBe(2); // Belgrano y Palermo
        });
        it("should sort zones alphabetically", () => {
            const storesByZone = service.getStoresByZone();
            const zones = storesByZone.map((g) => g.zone);
            const sortedZones = [...zones].sort();
            expect(zones).toEqual(sortedZones);
        });
    });
    describe("getAvailableZones", () => {
        it("should return unique zones", () => {
            const zones = service.getAvailableZones();
            expect(zones).toContain("CABA Norte");
            expect(zones).toContain("Zona Sur");
            expect(zones).toContain("Zona Oeste");
        });
        it("should not include duplicates", () => {
            const zones = service.getAvailableZones();
            const uniqueZones = [...new Set(zones)];
            expect(zones.length).toBe(uniqueZones.length);
        });
        it("should sort zones alphabetically", () => {
            const zones = service.getAvailableZones();
            const sortedZones = [...zones].sort();
            expect(zones).toEqual(sortedZones);
        });
    });
    describe("getStoresInZone", () => {
        it("should return stores in specified zone", () => {
            const stores = service.getStoresInZone("CABA Norte");
            expect(stores.length).toBe(2);
            stores.forEach((store) => {
                expect(store.zone).toBe("CABA Norte");
            });
        });
        it("should return empty array for unknown zone", () => {
            const stores = service.getStoresInZone("Unknown Zone");
            expect(stores).toEqual([]);
        });
    });
    describe("findStoreByCode", () => {
        it("should find store by code", () => {
            const store = service.findStoreByCode("REINO_1");
            expect(store).toBeDefined();
            expect(store?.name).toBe("Reino 1 - Belgrano");
        });
        it("should return undefined for unknown code", () => {
            const store = service.findStoreByCode("REINO_999");
            expect(store).toBeUndefined();
        });
    });
    describe("findStoreById", () => {
        it("should find store by id", () => {
            const store = service.findStoreById("store-1");
            expect(store).toBeDefined();
            expect(store?.code).toBe("REINO_1");
        });
        it("should return undefined for unknown id", () => {
            const store = service.findStoreById("unknown-id");
            expect(store).toBeUndefined();
        });
    });
    describe("parseLocationMessage", () => {
        it("should parse WhatsApp location data", () => {
            const locationData = {
                latitude: -34.5614,
                longitude: -58.4537,
            };
            const coordinates = service.parseLocationMessage(locationData);
            expect(coordinates.latitude).toBe(-34.5614);
            expect(coordinates.longitude).toBe(-58.4537);
        });
    });
    describe("isWithinCoverageArea", () => {
        it("should return true for coordinates in Buenos Aires", () => {
            const coordinates = {
                latitude: -34.6,
                longitude: -58.4,
            };
            expect(service.isWithinCoverageArea(coordinates)).toBe(true);
        });
        it("should return false for coordinates outside coverage", () => {
            // Córdoba, Argentina
            const coordinates = {
                latitude: -31.4167,
                longitude: -64.1833,
            };
            expect(service.isWithinCoverageArea(coordinates)).toBe(false);
        });
        it("should handle edge cases at boundaries", () => {
            // Límite norte
            const north = { latitude: -34.2, longitude: -58.4 };
            expect(service.isWithinCoverageArea(north)).toBe(true);
            // Límite sur
            const south = { latitude: -35.2, longitude: -58.4 };
            expect(service.isWithinCoverageArea(south)).toBe(true);
            // Fuera del límite
            const outside = { latitude: -35.3, longitude: -58.4 };
            expect(service.isWithinCoverageArea(outside)).toBe(false);
        });
    });
});
