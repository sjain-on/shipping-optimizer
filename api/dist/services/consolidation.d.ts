export declare function createConsolidationDraft(orders: {
    externalOrderId: string;
    customerEmail: string;
    shippingAddress: string;
}[]): Promise<{
    status: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
}>;
//# sourceMappingURL=consolidation.d.ts.map