import { EasyEcomAdapter, EasyEcomOrder, EasyEcomOrderItem, EasyEcomInvoice, CreateEasyEcomOrderInput, UpdateEasyEcomAWBInput, FetchEasyEcomOrdersInput } from './types';
import { prisma } from '@shipping-combinator/api/src/prisma.js';

export class MockEasyEcomAdapter implements EasyEcomAdapter {
  private orders: Map<string, EasyEcomOrder> = new Map();
  private invoices: Map<string, EasyEcomInvoice> = new Map();
  private externalOrderIdIndex: Map<string, string> = new Map(); // externalOrderId -> orderId

  constructor() {
    this.seedMockData();
  }

  private seedMockData() {
    // Seed with some mock orders
    const mockOrders: EasyEcomOrder[] = [
      {
        id: 'ee-order-1001',
        externalOrderId: 'gid://shopify/Order/1001',
        customerId: 'gid://shopify/Customer/5001',
        shippingAddress: {
          address1: '123 Main St',
          address2: '',
          city: 'Mumbai',
          province: 'Maharashtra',
          country: 'India',
          zip: '400001',
          name: 'John Doe',
          phone: '+91-9876543210',
        },
        items: [
          { sku: 'TSHIRT-001', quantity: 2, price: 29.99, name: 'T-Shirt' },
        ],
        status: 'confirmed',
        createdAt: new Date('2026-11-09').toISOString(),
      },
      {
        id: 'ee-order-1002',
        externalOrderId: 'gid://shopify/Order/1002',
        customerId: 'gid://shopify/Customer/5001',
        shippingAddress: {
          address1: '123 Main St',
          address2: '',
          city: 'Mumbai',
          province: 'Maharashtra',
          country: 'India',
          zip: '400001',
          name: 'John Doe',
          phone: '+91-9876543210',
        },
        items: [
          { sku: 'JEANS-001', quantity: 1, price: 49.99, name: 'Jeans' },
        ],
        status: 'confirmed',
        createdAt: new Date('2026-11-09').toISOString(),
      },
    ];

    for (const order of mockOrders) {
      this.orders.set(order.id, order);
      this.externalOrderIdIndex.set(order.externalOrderId, order.id);
    }
  }

  async createOrder(input: CreateEasyEcomOrderInput): Promise<EasyEcomOrder> {
    // Check idempotency - if order with same externalOrderId exists, return it
    const existingOrderId = this.externalOrderIdIndex.get(input.externalOrderId);
    if (existingOrderId) {
      return this.orders.get(existingOrderId)!;
    }

    const orderId = `ee-order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const order: EasyEcomOrder = {
      id: orderId,
      externalOrderId: input.externalOrderId,
      customerId: input.customerId,
      shippingAddress: input.shippingAddress,
      items: input.items,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    this.orders.set(orderId, order);
    this.externalOrderIdIndex.set(input.externalOrderId, orderId);

    return order;
  }

  async getOrder(orderId: string): Promise<EasyEcomOrder | null> {
    return this.orders.get(orderId) || null;
  }

  async getOrderByExternalId(externalOrderId: string): Promise<EasyEcomOrder | null> {
    const orderId = this.externalOrderIdIndex.get(externalOrderId);
    if (!orderId) return null;
    return this.orders.get(orderId) || null;
  }

  async updateAWB(input: UpdateEasyEcomAWBInput): Promise<EasyEcomInvoice> {
    const order = this.orders.get(input.orderId);
    if (!order) {
      throw new Error(`Order ${input.orderId} not found`);
    }

    // Create invoice with AWB
    const invoice: EasyEcomInvoice = {
      id: input.invoiceId,
      orderId: input.orderId,
      awb: input.awb,
      status: 'synced',
      createdAt: new Date().toISOString(),
    };

    this.invoices.set(input.invoiceId, invoice);
    return invoice;
  }

  async getInvoice(invoiceId: string): Promise<EasyEcomInvoice | null> {
    return this.invoices.get(invoiceId) || null;
  }

  async fetchOrders(input: { fromDate?: string; page?: number; limit?: number }): Promise<EasyEcomOrder[]> {
    const { fromDate, page = 1, limit = 50 } = input;

    let orders = Array.from(this.orders.values());

    // Filter by fromDate if provided
    if (fromDate) {
      const from = new Date(fromDate);
      orders = orders.filter(order => new Date(order.createdAt) >= from);
    }

    // Simple pagination
    const start = (page - 1) * limit;
    const end = start + limit;

    return orders.slice(start, end);
  }

  async ingestOrders(fromDate: string): Promise<{ ordersIngested: number; ordersUpdated: number }> {
    // Mock implementation - fetch orders and persist to database
    const orders = Array.from(this.orders.values());
    const filtered = fromDate
      ? orders.filter(order => new Date(order.createdAt) >= new Date(fromDate))
      : orders;

    let ordersIngested = 0;
    let ordersUpdated = 0;

    for (const order of filtered) {
      // Convert EasyEcomOrder to Prisma format
      const shippingAddress = JSON.stringify(order.shippingAddress);
      const items = JSON.stringify(order.items);

      const existingOrder = await prisma.easyEcomOrder.findUnique({
        where: { externalOrderId: order.externalOrderId },
      });

      if (existingOrder) {
        await prisma.easyEcomOrder.update({
          where: { id: existingOrder.id },
          data: {
            easyEcomOrderId: order.id,
            invoiceId: order.id, // Using order id as invoice id for mock
            rawData: JSON.stringify(order),
            customerEmail: order.shippingAddress.name, // Using name as mock email
            customerPhone: order.shippingAddress.phone || '',
            customerName: order.shippingAddress.name,
            shippingAddress,
            items,
            status: order.status,
            updatedAt: new Date(),
          },
        });
        ordersUpdated++;
      } else {
        await prisma.easyEcomOrder.create({
          data: {
            externalOrderId: order.externalOrderId,
            easyEcomOrderId: order.id,
            invoiceId: order.id,
            rawData: JSON.stringify(order),
            customerEmail: order.shippingAddress.name,
            customerPhone: order.shippingAddress.phone || '',
            customerName: order.shippingAddress.name,
            shippingAddress,
            items,
            status: order.status,
          },
        });
        ordersIngested++;
      }
    }

    return {
      ordersIngested,
      ordersUpdated,
    };
  }
}

export function createEasyEcomAdapter(): EasyEcomAdapter {
  return new MockEasyEcomAdapter();
}