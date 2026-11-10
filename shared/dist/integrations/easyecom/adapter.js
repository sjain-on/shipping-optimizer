"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockEasyEcomAdapter = void 0;
exports.createEasyEcomAdapter = createEasyEcomAdapter;
const prisma_js_1 = require("@shipping-combinator/api/src/prisma.js");
class MockEasyEcomAdapter {
    orders = new Map();
    invoices = new Map();
    externalOrderIdIndex = new Map(); // externalOrderId -> orderId
    constructor() {
        this.seedMockData();
    }
    seedMockData() {
        // Seed with some mock orders
        const mockOrders = [
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
    async createOrder(input) {
        // Check idempotency - if order with same externalOrderId exists, return it
        const existingOrderId = this.externalOrderIdIndex.get(input.externalOrderId);
        if (existingOrderId) {
            return this.orders.get(existingOrderId);
        }
        const orderId = `ee-order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const order = {
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
    async getOrder(orderId) {
        return this.orders.get(orderId) || null;
    }
    async getOrderByExternalId(externalOrderId) {
        const orderId = this.externalOrderIdIndex.get(externalOrderId);
        if (!orderId)
            return null;
        return this.orders.get(orderId) || null;
    }
    async updateAWB(input) {
        const order = this.orders.get(input.orderId);
        if (!order) {
            throw new Error(`Order ${input.orderId} not found`);
        }
        // Create invoice with AWB
        const invoice = {
            id: input.invoiceId,
            orderId: input.orderId,
            awb: input.awb,
            status: 'synced',
            createdAt: new Date().toISOString(),
        };
        this.invoices.set(input.invoiceId, invoice);
        return invoice;
    }
    async getInvoice(invoiceId) {
        return this.invoices.get(invoiceId) || null;
    }
    async fetchOrders(input) {
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
    async ingestOrders(fromDate) {
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
            const existingOrder = await prisma_js_1.prisma.easyEcomOrder.findUnique({
                where: { externalOrderId: order.externalOrderId },
            });
            if (existingOrder) {
                await prisma_js_1.prisma.easyEcomOrder.update({
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
            }
            else {
                await prisma_js_1.prisma.easyEcomOrder.create({
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
exports.MockEasyEcomAdapter = MockEasyEcomAdapter;
function createEasyEcomAdapter() {
    return new MockEasyEcomAdapter();
}
//# sourceMappingURL=adapter.js.map