import { EasyEcomAdapter, EasyEcomOrder, EasyEcomInvoice, CreateEasyEcomOrderInput, UpdateEasyEcomAWBInput } from './types';
export declare class MockEasyEcomAdapter implements EasyEcomAdapter {
    private orders;
    private invoices;
    private externalOrderIdIndex;
    constructor();
    private seedMockData;
    createOrder(input: CreateEasyEcomOrderInput): Promise<EasyEcomOrder>;
    getOrder(orderId: string): Promise<EasyEcomOrder | null>;
    getOrderByExternalId(externalOrderId: string): Promise<EasyEcomOrder | null>;
    updateAWB(input: UpdateEasyEcomAWBInput): Promise<EasyEcomInvoice>;
    getInvoice(invoiceId: string): Promise<EasyEcomInvoice | null>;
    fetchOrders(input: {
        fromDate?: string;
        page?: number;
        limit?: number;
    }): Promise<EasyEcomOrder[]>;
    ingestOrders(fromDate: string): Promise<{
        ordersIngested: number;
        ordersUpdated: number;
    }>;
}
export declare function createEasyEcomAdapter(): EasyEcomAdapter;
//# sourceMappingURL=adapter.d.ts.map