import { prisma } from '../prisma.js';

export async function syncShipmentAWB(shipmentId: string, awb: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { orderLink: true },
  });

  if (!shipment) {
    throw new Error('Shipment not found');
  }

  return await prisma.$transaction(async (tx) => {
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
