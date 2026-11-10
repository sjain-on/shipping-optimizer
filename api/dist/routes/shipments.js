import { CreateShipmentSchema, SyncAWBSchema } from '../schemas.js';
import { prisma } from '../prisma.js';
import { syncShipmentAWB } from '../services/shipment.js';
import { createShopifyAdapter } from '../integrations/shopify/adapter.js';
export async function shipmentRoutes(server) {
    server.post('/', async (request, reply) => {
        const { consolidationId } = CreateShipmentSchema.parse(request.body);
        const consolidation = await prisma.consolidation.findUnique({
            where: { id: consolidationId },
            include: { orderLinks: true },
        });
        if (!consolidation) {
            return reply.status(404).send({ error: 'Consolidation not found' });
        }
        if (consolidation.status !== 'APPROVED') {
            return reply.status(400).send({ error: 'Consolidation must be approved before creating shipment' });
        }
        // Create shipments for each order link (one per order)
        const shipments = await prisma.$transaction(async (tx) => {
            const createdShipments = [];
            for (const orderLink of consolidation.orderLinks) {
                const shipment = await tx.shipment.create({
                    data: {
                        orderLinkId: orderLink.id,
                        status: 'CREATED',
                    },
                });
                createdShipments.push(shipment);
            }
            return createdShipments;
        });
        // Update consolidation status
        await prisma.consolidation.update({
            where: { id: consolidationId },
            data: { status: 'SHIPMENT_CREATED' },
        });
        await prisma.auditLog.create({
            data: {
                entityType: 'Consolidation',
                entityId: consolidationId,
                action: 'SHIPMENTS_CREATED',
                actor: 'system',
                diff: JSON.stringify({ shipmentIds: shipments.map(s => s.id) }),
                consolidationId,
            },
        });
        return reply.status(201).send({ shipments });
    });
    server.post('/:id/sync-awb', async (request, reply) => {
        const { id } = request.params;
        const { awb } = SyncAWBSchema.parse(request.body);
        try {
            const updated = await syncShipmentAWB(id, awb);
            return { status: 'synced', shipment: updated };
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Shipment not found') {
                return reply.status(404).send({ error: 'Shipment not found' });
            }
            throw error;
        }
    });
    server.post('/:id/fulfill', async (request, reply) => {
        const { id } = request.params;
        const shipment = await prisma.shipment.findUnique({
            where: { id },
            include: { orderLink: true },
        });
        if (!shipment) {
            return reply.status(404).send({ error: 'Shipment not found' });
        }
        if (!shipment.orderLink) {
            return reply.status(400).send({ error: 'Shipment is not linked to an order' });
        }
        if (!shipment.awb) {
            return reply.status(400).send({ error: 'Shipment must have an AWB before fulfillment' });
        }
        // Create fulfillment synchronously using Shopify adapter
        const shopifyAdapter = createShopifyAdapter();
        try {
            // Fetch Shopify order to get line items for fulfillment
            const shopifyOrder = await shopifyAdapter.getOrder(shipment.orderLink.shopifyOrderId);
            if (!shopifyOrder) {
                return reply.status(404).send({ error: 'Shopify order not found' });
            }
            const lineItems = shopifyOrder.lineItems.map(item => ({
                id: item.id,
                quantity: item.quantity,
            }));
            const fulfillment = await shopifyAdapter.createFulfillment({
                orderId: shipment.orderLink.shopifyOrderId,
                trackingNumber: shipment.awb,
                trackingCompany: 'Quickshift',
                lineItems,
                idempotencyKey: `fulfill-${shipment.id}`,
            });
            // Update shipment status
            await prisma.shipment.update({
                where: { id },
                data: { status: 'FULFILLED' },
            });
            await prisma.auditLog.create({
                data: {
                    entityType: 'Shipment',
                    entityId: id,
                    action: 'FULFILLMENT_CREATED',
                    actor: 'system',
                    diff: JSON.stringify({ fulfillmentId: fulfillment.id, trackingNumber: shipment.awb }),
                    consolidationId: shipment.orderLink.consolidationId,
                },
            });
            return { status: 'fulfilled', fulfillment };
        }
        catch (error) {
            console.error('Fulfillment creation error:', error);
            return reply.status(500).send({ error: 'Failed to create fulfillment' });
        }
    });
    server.get('/:id', async (request, reply) => {
        const { id } = request.params;
        const shipment = await prisma.shipment.findUnique({
            where: { id },
        });
        if (!shipment) {
            return reply.status(404).send({ error: 'Shipment not found' });
        }
        return shipment;
    });
}
//# sourceMappingURL=shipments.js.map