"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockQuickshiftAdapter = void 0;
exports.createQuickshiftAdapter = createQuickshiftAdapter;
class MockQuickshiftAdapter {
    shipments = new Map();
    async createShipment(input) {
        const shipmentId = `qs-shipment-${Date.now()}`;
        const shipment = {
            id: shipmentId,
            orderIds: input.orderIds,
            status: 'created',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            labelUrl: 'https://mock.label.url',
        };
        this.shipments.set(shipmentId, shipment);
        return shipment;
    }
    async getShipment(shipmentId) {
        return this.shipments.get(shipmentId) || null;
    }
    async schedulePickup(shipmentId, pickupDate) {
        const shipment = this.shipments.get(shipmentId);
        if (shipment) {
            shipment.status = 'pickup_scheduled';
            shipment.updatedAt = new Date().toISOString();
        }
    }
    async getLabel(shipmentId) {
        return this.shipments.get(shipmentId)?.labelUrl || '';
    }
}
exports.MockQuickshiftAdapter = MockQuickshiftAdapter;
function createQuickshiftAdapter() {
    return new MockQuickshiftAdapter();
}
//# sourceMappingURL=adapter.js.map