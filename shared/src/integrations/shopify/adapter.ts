import { ShopifyAdapter, ShopifyOrder, ShopifyLineItem, ShopifyFulfillment, CreateFulfillmentInput } from './types';

export class MockShopifyAdapter implements ShopifyAdapter {
  private orders: Map<string, ShopifyOrder> = new Map();
  private fulfillments: Map<string, ShopifyFulfillment> = new Map();

  constructor() {
    // Seed with some mock data
    this.seedMockData();
  }

  private seedMockData() {
    const mockOrders: ShopifyOrder[] = [
      {
        id: 'gid://shopify/Order/1001',
        name: '#1001',
        customer: { id: 'gid://shopify/Customer/5001' },
        shippingAddress: {
          address1: '123 Main St',
          address2: '',
          city: 'Mumbai',
          province: 'Maharashtra',
          country: 'India',
          zip: '400001',
        },
        financialStatus: 'paid',
        fulfillmentStatus: 'unfulfilled',
        lineItems: [
          { id: 'gid://shopify/LineItem/1001', variantId: 'gid://shopify/ProductVariant/1001', title: 'T-Shirt', quantity: 2, price: '29.99' },
        ],
      },
      {
        id: 'gid://shopify/Order/1002',
        name: '#1002',
        customer: { id: 'gid://shopify/Customer/5001' },
        shippingAddress: {
          address1: '123 Main St',
          address2: '',
          city: 'Mumbai',
          province: 'Maharashtra',
          country: 'India',
          zip: '400001',
        },
        financialStatus: 'paid',
        fulfillmentStatus: 'unfulfilled',
        lineItems: [
          { id: 'gid://shopify/LineItem/1002', variantId: 'gid://shopify/ProductVariant/1002', title: 'Jeans', quantity: 1, price: '49.99' },
        ],
      },
      {
        id: 'gid://shopify/Order/1003',
        name: '#1003',
        customer: { id: 'gid://shopify/Customer/5002' },
        shippingAddress: {
          address1: '456 Oak Ave',
          address2: 'Apt 2B',
          city: 'Delhi',
          province: 'Delhi',
          country: 'India',
          zip: '110001',
        },
        financialStatus: 'paid',
        fulfillmentStatus: 'unfulfilled',
        lineItems: [
          { id: 'gid://shopify/LineItem/1003', variantId: 'gid://shopify/ProductVariant/1003', title: 'Sneakers', quantity: 1, price: '79.99' },
        ],
      },
    ];

    for (const order of mockOrders) {
      this.orders.set(order.id, order);
    }
  }

  async getOrders(filters: {
    customerId?: string;
    addressHash?: string;
    fulfillmentStatus?: string;
    financialStatus?: string;
  }): Promise<ShopifyOrder[]> {
    let orders = Array.from(this.orders.values());

    if (filters.customerId) {
      orders = orders.filter(o => o.customer.id === filters.customerId);
    }
    if (filters.fulfillmentStatus) {
      orders = orders.filter(o => o.fulfillmentStatus === filters.fulfillmentStatus);
    }
    if (filters.financialStatus) {
      orders = orders.filter(o => o.financialStatus === filters.financialStatus);
    }

    return orders;
  }

  async createFulfillment(input: CreateFulfillmentInput): Promise<ShopifyFulfillment> {
    const order = this.orders.get(input.orderId);
    if (!order) {
      throw new Error(`Order ${input.orderId} not found`);
    }

    const fulfillment: ShopifyFulfillment = {
      id: `gid://shopify/Fulfillment/${Date.now()}`,
      orderId: input.orderId,
      trackingNumber: input.trackingNumber,
      trackingCompany: input.trackingCompany,
      trackingUrl: input.trackingUrl,
      status: 'success',
      lineItems: input.lineItems,
    };

    this.fulfillments.set(fulfillment.id, fulfillment);

    // Update order fulfillment status
    order.fulfillmentStatus = 'fulfilled';
    this.orders.set(input.orderId, order);

    return fulfillment;
  }

  async getOrder(orderId: string): Promise<ShopifyOrder | null> {
    return this.orders.get(orderId) || null;
  }
}

export function createShopifyAdapter(): ShopifyAdapter {
  return new MockShopifyAdapter();
}