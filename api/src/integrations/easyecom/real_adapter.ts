import { prisma } from '../../prisma.js';
import {
  EasyEcomAdapter,
  EasyEcomOrder,
  EasyEcomOrderItem,
  EasyEcomInvoice,
  CreateEasyEcomOrderInput,
  UpdateEasyEcomAWBInput,
  FetchEasyEcomOrdersInput,
} from './types.js';

const EASYECOM_BASE_URL = 'https://api.easyecom.io';

class EasyEcomApiError extends Error {
  public readonly status: number;
  public readonly retryAfter?: number;

  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.name = 'EasyEcomApiError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

interface EasyEcomCreateOrderResponse {
  order_id: string;
  invoice_id: string;
  external_order_id: string;
  customer: {
    email: string;
    phone: string;
    name: string;
  };
  shipping_address: {
    address1: string;
    address2: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  line_items: Array<{
    sku: string;
    qty: number;
    price: number;
    tax: number;
    name: string;
  }>;
  financial_status: string;
  fulfillment_status: string;
  created_at: string;
}

interface EasyEcomGetOrderResponse {
  order_id: string;
  invoice_id: string;
  external_order_id: string;
  customer: {
    email: string;
    phone: string;
    name: string;
  };
  shipping_address: {
    address1: string;
    address2: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  line_items: Array<{
    sku: string;
    qty: number;
    price: number;
    tax: number;
    name: string;
  }>;
  financial_status: string;
  fulfillment_status: string;
  created_at: string;
}

interface EasyEcomUpdateTrackingResponse {
  success: boolean;
  message: string;
}

interface EasyEcomInvoiceResponse {
  invoice_id: string;
  order_id: string;
  awb: string;
  status: string;
  created_at: string;
  pdf_url?: string;
}

function getAuthHeaders(): Record<string, string> {
  const apiKey = process.env.ADMIN_API_KEY;
  if (!apiKey) {
    throw new Error('ADMIN_API_KEY environment variable is not set');
  }

  // According to docs: JWT Token + X-API-Key both required
  // For now using the ADMIN_API_KEY as both (since JWT generation is a separate flow)
  // In production, you'd implement the JWT token generation via Authorization API
  return {
    'X-API-Key': apiKey,
    'Authorization': `Bearer ${apiKey}`, // Using ADMIN_API_KEY as JWT for now
    'Content-Type': 'application/json',
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : Math.pow(2, attempt) * 1000;

        if (attempt < maxRetries) {
          await sleep(retryAfter);
          continue;
        }

        throw new EasyEcomApiError('Rate limit exceeded', 429, retryAfter);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries && !(error instanceof EasyEcomApiError)) {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

function mapOrderFromApi(apiOrder: EasyEcomCreateOrderResponse | EasyEcomGetOrderResponse): EasyEcomOrder {
  return {
    id: apiOrder.order_id,
    externalOrderId: apiOrder.external_order_id,
    customerId: apiOrder.customer.email, // Using email as customerId since API doesn't return a separate customerId
    shippingAddress: {
      address1: apiOrder.shipping_address.address1,
      address2: apiOrder.shipping_address.address2 || '',
      city: apiOrder.shipping_address.city,
      province: apiOrder.shipping_address.state,
      country: apiOrder.shipping_address.country,
      zip: apiOrder.shipping_address.pincode,
      name: apiOrder.shipping_address.address1, // Using address1 as name fallback
      phone: apiOrder.customer.phone,
    },
    items: apiOrder.line_items.map(item => ({
      sku: item.sku,
      quantity: item.qty,
      price: item.price,
      name: item.name,
    })),
    status: apiOrder.fulfillment_status || apiOrder.financial_status,
    createdAt: apiOrder.created_at,
  };
}

function mapInvoiceFromApi(apiInvoice: EasyEcomInvoiceResponse): EasyEcomInvoice {
  return {
    id: apiInvoice.invoice_id,
    orderId: apiInvoice.order_id,
    awb: apiInvoice.awb,
    status: apiInvoice.status as 'pending' | 'generated' | 'synced',
    createdAt: apiInvoice.created_at,
  };
}

export class RealEasyEcomAdapter implements EasyEcomAdapter {
  private baseUrl: string;

  constructor(baseUrl: string = EASYECOM_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async fetchOrders(input: FetchEasyEcomOrdersInput): Promise<EasyEcomOrder[]> {
    const url = `${this.baseUrl}/api/v2/orders/getOrders`;

    const payload = {
      page: input.page || 1,
      limit: input.limit || 50,
      from_date: input.fromDate,
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch orders: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as Array<EasyEcomCreateOrderResponse | EasyEcomGetOrderResponse>;
    return data.map(mapOrderFromApi);
  }

  async createOrder(input: CreateEasyEcomOrderInput): Promise<EasyEcomOrder> {
    const url = `${this.baseUrl}/api/v2/orders/createOrder`;

    const payload = {
      external_order_id: input.externalOrderId,
      invoice_id: input.idempotencyKey, // Using idempotencyKey as invoice_id since it must be unique per order
      customer: {
        email: input.customerId,
        phone: input.shippingAddress.phone || '',
        name: input.shippingAddress.name,
      },
      shipping_address: {
        address1: input.shippingAddress.address1,
        address2: input.shippingAddress.address2 || '',
        city: input.shippingAddress.city,
        state: input.shippingAddress.province,
        pincode: input.shippingAddress.zip,
        country: input.shippingAddress.country,
      },
      line_items: input.items.map(item => ({
        sku: item.sku,
        qty: item.quantity,
        price: item.price,
        tax: 0, // Tax not in our input type
        name: item.name,
      })),
      financial_status: 'paid',
      warehouse_id: 'default', // Would need to be configurable
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create order: ${response.status} ${errorText}`);
    }

    const data = await response.json() as EasyEcomCreateOrderResponse;
    return mapOrderFromApi(data);
  }

  async getOrder(orderId: string): Promise<EasyEcomOrder | null> {
    const url = `${this.baseUrl}/api/v2/orders/getOrderDetails`;

    const payload = {
      order_id: orderId,
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get order: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as EasyEcomGetOrderResponse;
    return mapOrderFromApi(data);
  }

  async getOrderByExternalId(externalOrderId: string): Promise<EasyEcomOrder | null> {
    const url = `${this.baseUrl}/api/v2/orders/getOrderDetails`;

    const payload = {
      external_order_id: externalOrderId,
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get order by external ID: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as EasyEcomGetOrderResponse;
    return mapOrderFromApi(data);
  }

  async updateAWB(input: UpdateEasyEcomAWBInput): Promise<EasyEcomInvoice> {
    const url = `${this.baseUrl}/api/v2/shipments/updateTrackingStatus`;

    const payload = {
      invoice_id: input.invoiceId,
      awb: input.awb,
      tracking_url: `https://track.quickshift.com/${input.awb}`,
      carrier: 'Quickshift',
      status: 'picked_up', // Initial status when AWB is assigned
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update AWB: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as EasyEcomUpdateTrackingResponse;

    // After updating tracking, fetch the invoice to return updated state
    return this.getInvoice(input.invoiceId) as Promise<EasyEcomInvoice>;
  }

  async getInvoice(invoiceId: string): Promise<EasyEcomInvoice | null> {
    const url = `${this.baseUrl}/api/v2/orders/getOrderDetails`;

    const payload = {
      invoice_id: invoiceId,
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get invoice: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as EasyEcomGetOrderResponse;

    // The invoice details are embedded in the order response
    // We need to extract AWB info - typically available after tracking update
    const invoice: EasyEcomInvoice = {
      id: data.invoice_id,
      orderId: data.order_id,
      awb: '', // AWB not in getOrderDetails response, would need separate endpoint
      status: 'generated',
      createdAt: data.created_at,
    };

    return invoice;
  }

  async ingestOrders(fromDate: string): Promise<{ ordersIngested: number; ordersUpdated: number }> {
    const fetchedOrders = await this.fetchOrders({ fromDate });

    let ordersIngested = 0;
    let ordersUpdated = 0;

    for (const order of fetchedOrders) {
      const existingOrder = await prisma.easyEcomOrder.findUnique({
        where: { id: order.id },
      });

      const customerEmail = order.shippingAddress.name?.includes('@') ? order.shippingAddress.name : undefined;
      const customerPhone = order.shippingAddress.phone;
      const customerName = order.shippingAddress.name;

      if (existingOrder) {
        // Update existing order
        await prisma.easyEcomOrder.update({
          where: { id: order.id },
          data: {
            externalOrderId: order.externalOrderId,
            customerEmail,
            customerPhone,
            customerName,
            shippingAddress: JSON.stringify(order.shippingAddress),
            items: JSON.stringify(order.items),
            status: order.status,
            createdAt: order.createdAt,
            rawData: JSON.stringify(order),
          },
        });
        ordersUpdated++;
      } else {
        // Create new order
        await prisma.easyEcomOrder.create({
          data: {
            id: order.id,
            externalOrderId: order.externalOrderId,
            easyEcomOrderId: order.id,
            invoiceId: '', // Will be set when invoice is created
            customerEmail: customerEmail || '',
            customerPhone: customerPhone || '',
            customerName: customerName || '',
            shippingAddress: JSON.stringify(order.shippingAddress),
            items: JSON.stringify(order.items),
            status: order.status,
            createdAt: order.createdAt,
            rawData: JSON.stringify(order),
          },
        });
        ordersIngested++;
      }
    }

    return { ordersIngested, ordersUpdated };
  }
}

export function createRealEasyEcomAdapter(): EasyEcomAdapter {
  return new RealEasyEcomAdapter();
}

// Export types for testing
export type {
  EasyEcomCreateOrderResponse,
  EasyEcomGetOrderResponse,
  EasyEcomUpdateTrackingResponse,
  EasyEcomInvoiceResponse,
  EasyEcomApiError,
};