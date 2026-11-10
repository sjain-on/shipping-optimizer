import { prisma } from '../../prisma.js';
const EASYECOM_BASE_URL = 'https://api.easyecom.io';
class EasyEcomApiError extends Error {
    status;
    retryAfter;
    constructor(message, status, retryAfter) {
        super(message);
        this.name = 'EasyEcomApiError';
        this.status = status;
        this.retryAfter = retryAfter;
    }
}
function getAuthHeaders() {
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
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError = null;
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
        }
        catch (error) {
            lastError = error;
            if (attempt < maxRetries && !(error instanceof EasyEcomApiError)) {
                await sleep(Math.pow(2, attempt) * 1000);
                continue;
            }
            throw error;
        }
    }
    throw lastError || new Error('Max retries exceeded');
}
function mapOrderFromApi(apiOrder) {
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
function mapInvoiceFromApi(apiInvoice) {
    return {
        id: apiInvoice.invoice_id,
        orderId: apiInvoice.order_id,
        awb: apiInvoice.awb,
        status: apiInvoice.status,
        createdAt: apiInvoice.created_at,
    };
}
export class RealEasyEcomAdapter {
    baseUrl;
    constructor(baseUrl = EASYECOM_BASE_URL) {
        this.baseUrl = baseUrl;
    }
    async fetchOrders(input) {
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
        const data = (await response.json());
        return data.map(mapOrderFromApi);
    }
    async createOrder(input) {
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
        const data = await response.json();
        return mapOrderFromApi(data);
    }
    async getOrder(orderId) {
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
        const data = (await response.json());
        return mapOrderFromApi(data);
    }
    async getOrderByExternalId(externalOrderId) {
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
        const data = (await response.json());
        return mapOrderFromApi(data);
    }
    async updateAWB(input) {
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
        const data = (await response.json());
        // After updating tracking, fetch the invoice to return updated state
        return this.getInvoice(input.invoiceId);
    }
    async getInvoice(invoiceId) {
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
        const data = (await response.json());
        // The invoice details are embedded in the order response
        // We need to extract AWB info - typically available after tracking update
        const invoice = {
            id: data.invoice_id,
            orderId: data.order_id,
            awb: '', // AWB not in getOrderDetails response, would need separate endpoint
            status: 'generated',
            createdAt: data.created_at,
        };
        return invoice;
    }
    async ingestOrders(fromDate) {
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
            }
            else {
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
export function createRealEasyEcomAdapter() {
    return new RealEasyEcomAdapter();
}
//# sourceMappingURL=real_adapter.js.map