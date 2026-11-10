export interface EasyEcomOrder {
  id: string;
  externalOrderId: string;
  customerId: string;
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
  items: EasyEcomOrderItem[];
  status: string;
  createdAt: string;
}

export interface EasyEcomOrderItem {
  sku: string;
  quantity: number;
  price: number;
  name: string;
}

export interface EasyEcomInvoice {
  id: string;
  orderId: string;
  awb: string;
  status: 'pending' | 'generated' | 'synced';
  createdAt: string;
}

export interface EasyEcomShipment {
  id: string;
  orderId: string;
  awb: string;
  carrier: string;
  status: string;
  trackingUrl?: string;
  createdAt: string;
}

export interface CreateEasyEcomOrderInput {
  externalOrderId: string;
  customerId: string;
  shippingAddress: EasyEcomOrder['shippingAddress'];
  items: EasyEcomOrderItem[];
  idempotencyKey: string;
}

export interface FetchEasyEcomOrdersInput {
  page?: number;
  limit?: number;
  fromDate?: string;
}

export interface UpdateEasyEcomAWBInput {
  orderId: string;
  awb: string;
  invoiceId: string;
  idempotencyKey: string;
}

export interface EasyEcomAdapter {
  createOrder(input: CreateEasyEcomOrderInput): Promise<EasyEcomOrder>;
  getOrder(orderId: string): Promise<EasyEcomOrder | null>;
  getOrderByExternalId(externalOrderId: string): Promise<EasyEcomOrder | null>;
  fetchOrders(input: FetchEasyEcomOrdersInput): Promise<EasyEcomOrder[]>;
  updateAWB(input: UpdateEasyEcomAWBInput): Promise<EasyEcomInvoice>;
  getInvoice(invoiceId: string): Promise<EasyEcomInvoice | null>;
  ingestOrders(fromDate: string): Promise<{ ordersIngested: number; ordersUpdated: number }>;
}