import { QuickshiftAdapter, CreateQuickshiftShipmentInput, QuickshiftShipment } from './types.js';
export declare class MockQuickshiftAdapter implements QuickshiftAdapter {
    private shipments;
    createShipment(input: CreateQuickshiftShipmentInput): Promise<QuickshiftShipment>;
    getShipment(shipmentId: string): Promise<QuickshiftShipment | null>;
    schedulePickup(shipmentId: string, pickupDate: string): Promise<void>;
    getLabel(shipmentId: string): Promise<string>;
}
export declare function createQuickshiftAdapter(): QuickshiftAdapter;
//# sourceMappingURL=adapter.d.ts.map