export interface QuickshiftShipment {
  id: string;
  orderIds: string[];
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  status: 'created' | 'pickup_scheduled' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuickshiftShipmentInput {
  orderIds: string[];
  items: QuickshiftShipmentItem[];
  shippingAddress: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    name: string;
    phone?: string;
  };
  idempotencyKey: string;
}

export interface QuickshiftShipmentItem {
  sku: string;
  quantity: number;
  name: string;
  price: number;
}

export interface QuickshiftAdapter {
  createShipment(input: CreateQuickshiftShipmentInput): Promise<QuickshiftShipment>;
  getShipment(shipmentId: string): Promise<QuickshiftShipment | null>;
  schedulePickup(shipmentId: string, pickupDate: string): Promise<void>;
  getLabel(shipmentId: string): Promise<string>; // Returns label URL
}