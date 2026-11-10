export interface ShopifyOrder {
    id: string;
    name: string;
    customer: {
        id: string;
    };
    shippingAddress: {
        address1: string;
        address2?: string;
        city: string;
        province: string;
        country: string;
        zip: string;
    };
    financialStatus: string;
    fulfillmentStatus: string;
    lineItems: ShopifyLineItem[];
}
export interface ShopifyLineItem {
    id: string;
    variantId: string;
    title: string;
    quantity: number;
    price: string;
}
export interface ShopifyFulfillment {
    id: string;
    orderId: string;
    trackingNumber: string;
    trackingCompany: string;
    trackingUrl?: string;
    status: string;
    lineItems: ShopifyFulfillmentLineItem[];
}
export interface ShopifyFulfillmentLineItem {
    id: string;
    quantity: number;
}
export interface CreateFulfillmentInput {
    orderId: string;
    trackingNumber: string;
    trackingCompany: string;
    trackingUrl?: string;
    lineItems: {
        id: string;
        quantity: number;
    }[];
    idempotencyKey: string;
}
export interface ShopifyAdapter {
    getOrders(filters: {
        customerId?: string;
        addressHash?: string;
        fulfillmentStatus?: string;
        financialStatus?: string;
    }): Promise<ShopifyOrder[]>;
    createFulfillment(input: CreateFulfillmentInput): Promise<ShopifyFulfillment>;
    getOrder(orderId: string): Promise<ShopifyOrder | null>;
}
//# sourceMappingURL=types.d.ts.map