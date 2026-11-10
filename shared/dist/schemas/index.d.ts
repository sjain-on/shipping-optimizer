import { z } from 'zod';
export declare const CreateConsolidationSchema: z.ZodObject<{
    orderIds: z.ZodArray<z.ZodString, "many">;
    customerId: z.ZodString;
    shippingAddressHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orderIds: string[];
    customerId: string;
    shippingAddressHash: string;
}, {
    orderIds: string[];
    customerId: string;
    shippingAddressHash: string;
}>;
export declare const ApproveConsolidationSchema: z.ZodObject<{
    consolidationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    consolidationId: string;
}, {
    consolidationId: string;
}>;
export declare const CreateShipmentSchema: z.ZodObject<{
    consolidationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    consolidationId: string;
}, {
    consolidationId: string;
}>;
export declare const SyncAWBSchema: z.ZodObject<{
    shipmentId: z.ZodString;
    awb: z.ZodString;
}, "strip", z.ZodTypeAny, {
    shipmentId: string;
    awb: string;
}, {
    shipmentId: string;
    awb: string;
}>;
//# sourceMappingURL=index.d.ts.map