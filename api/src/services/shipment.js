"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncShipmentAWB = syncShipmentAWB;
const prisma_1 = require("../prisma");
async function syncShipmentAWB(shipmentId, awb) {
    const shipment = await prisma_1.prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: { orderLink: true },
    });
    if (!shipment) {
        throw new Error('Shipment not found');
    }
    return await prisma_1.prisma.$transaction(async (tx) => {
        const updatedShipment = await tx.shipment.update({
            where: { id: shipmentId },
            data: { awb, status: 'AWB_SYNCED' },
        });
        await tx.aWBSync.create({
            data: {
                orderLinkId: shipment.orderLinkId,
                invoiceId: `INV-${shipment.orderLinkId}-${Date.now()}`,
                awb,
                status: 'SYNCED',
            },
        });
        await tx.auditLog.create({
            data: {
                entityType: 'Shipment',
                entityId: shipmentId,
                action: 'AWB_SYNCED',
                actor: 'system',
                diff: JSON.stringify({ awb }),
                consolidationId: shipment.orderLink.consolidationId,
            },
        });
        return updatedShipment;
    });
}
//# sourceMappingURL=shipment.js.map