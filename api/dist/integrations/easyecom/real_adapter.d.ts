import { EasyEcomAdapter, EasyEcomOrder, EasyEcomInvoice, CreateEasyEcomOrderInput, UpdateEasyEcomAWBInput, FetchEasyEcomOrdersInput } from './types.js';
declare class EasyEcomApiError extends Error {
    readonly status: number;
    readonly retryAfter?: number;
    constructor(message: string, status: number, retryAfter?: number);
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
export declare class RealEasyEcomAdapter implements EasyEcomAdapter {
    private baseUrl;
    constructor(baseUrl?: string);
    fetchOrders(input: FetchEasyEcomOrdersInput): Promise<EasyEcomOrder[]>;
    createOrder(input: CreateEasyEcomOrderInput): Promise<EasyEcomOrder>;
    getOrder(orderId: string): Promise<EasyEcomOrder | null>;
    getOrderByExternalId(externalOrderId: string): Promise<EasyEcomOrder | null>;
    updateAWB(input: UpdateEasyEcomAWBInput): Promise<EasyEcomInvoice>;
    getInvoice(invoiceId: string): Promise<EasyEcomInvoice | null>;
    ingestOrders(fromDate: string): Promise<{
        ordersIngested: number;
        ordersUpdated: number;
    }>;
}
export declare function createRealEasyEcomAdapter(): EasyEcomAdapter;
export type { EasyEcomCreateOrderResponse, EasyEcomGetOrderResponse, EasyEcomUpdateTrackingResponse, EasyEcomInvoiceResponse, EasyEcomApiError, };
//# sourceMappingURL=real_adapter.d.ts.map