import { QuickshiftAdapter, CreateQuickshiftShipmentInput, QuickshiftShipment } from './types';

export class MockQuickshiftAdapter implements QuickshiftAdapter {
  private shipments: Map<string, QuickshiftShipment> = new Map();

  async createShipment(input: CreateQuickshiftShipmentInput): Promise<QuickshiftShipment> {
    const shipmentId = `qs-shipment-${Date.now()}`;
    const shipment: QuickshiftShipment = {
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

  async getShipment(shipmentId: string): Promise<QuickshiftShipment | null> {
    return this.shipments.get(shipmentId) || null;
  }

  async schedulePickup(shipmentId: string, pickupDate: string): Promise<void> {
    const shipment = this.shipments.get(shipmentId);
    if (shipment) {
      shipment.status = 'pickup_scheduled';
      shipment.updatedAt = new Date().toISOString();
    }
  }

  async getLabel(shipmentId: string): Promise<string> {
    return this.shipments.get(shipmentId)?.labelUrl || '';
  }
}

export function createQuickshiftAdapter(): QuickshiftAdapter {
  return new MockQuickshiftAdapter();
}