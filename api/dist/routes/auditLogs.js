import { prisma } from '../prisma.js';
export async function auditLogRoutes(server) {
    server.get('/', async (request, reply) => {
        const { consolidationId, shipmentId, orderId } = request.query;
        const where = {};
        if (consolidationId) {
            where.consolidationId = consolidationId;
        }
        else if (shipmentId) {
            where.entityType = 'shipment';
            where.entityId = shipmentId;
        }
        else if (orderId) {
            // Assuming we need to look up order-related logs via audit log diff or entity
            where.OR = [
                { diff: { contains: orderId } },
                { entityType: 'order', entityId: orderId }
            ];
        }
        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit for MVP
        });
        return logs;
    });
}
//# sourceMappingURL=auditLogs.js.map