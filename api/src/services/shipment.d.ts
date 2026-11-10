export declare function syncShipmentAWB(shipmentId: string, awb: string): Promise<{
    id: string;
    status: string | null;
    createdAt: Date;
    updatedAt: Date;
    quickshiftShipmentId: string | null;
    awb: string | null;
    labelUrl: string | null;
    orderLinkId: string;
}>;
//# sourceMappingURL=shipment.d.ts.map