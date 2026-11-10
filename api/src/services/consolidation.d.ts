export declare function createConsolidationDraft(orders: {
    externalOrderId: string;
    customerEmail: string;
    shippingAddress: string;
}[]): Promise<{
    id: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}>;
//# sourceMappingURL=consolidation.d.ts.map