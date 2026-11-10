import { prisma } from '../prisma.js';
import { createEasyEcomAdapter } from '@shipping-combinator/shared';
import { z } from 'zod';
export async function orderRoutes(server) {
    // GET /api/orders - List ingested orders
    server.get('/', async (request, reply) => {
        const { page = 1, limit = 50, status } = request.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = status ? { status } : {};
        const [orders, total] = await Promise.all([
            prisma.easyEcomOrder.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.easyEcomOrder.count({ where }),
        ]);
        return {
            orders,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        };
    });
    // GET /api/orders/:id - Get order details
    server.get('/:id', async (request, reply) => {
        const { id } = request.params;
        const order = await prisma.easyEcomOrder.findUnique({
            where: { id },
        });
        if (!order) {
            return reply.status(404).send({ error: 'Order not found' });
        }
        return { order };
    });
    // POST /api/orders/ingest - Manually trigger ingestion
    server.post('/ingest', async (request, reply) => {
        const bodySchema = z.object({
            fromDate: z.string().optional(),
        });
        const { fromDate } = bodySchema.parse(request.body || {});
        // Run ingestion synchronously instead of queueing
        const adapter = createEasyEcomAdapter();
        const startDate = fromDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const result = await adapter.ingestOrders(startDate);
        return {
            message: 'Ingestion completed',
            ordersIngested: result.ordersIngested,
            ordersUpdated: result.ordersUpdated,
        };
    });
}
//# sourceMappingURL=orders.js.map