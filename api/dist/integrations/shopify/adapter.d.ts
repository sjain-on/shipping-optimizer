import { ShopifyAdapter, ShopifyOrder, ShopifyFulfillment, CreateFulfillmentInput } from './types.js';
export declare class MockShopifyAdapter implements ShopifyAdapter {
    private orders;
    private fulfillments;
    constructor();
    private seedMockData;
    getOrders(filters: {
        customerId?: string;
        addressHash?: string;
        fulfillmentStatus?: string;
        financialStatus?: string;
    }): Promise<ShopifyOrder[]>;
    createFulfillment(input: CreateFulfillmentInput): Promise<ShopifyFulfillment>;
    getOrder(orderId: string): Promise<ShopifyOrder | null>;
}
export declare function createShopifyAdapter(): ShopifyAdapter;
//# sourceMappingURL=adapter.d.ts.map