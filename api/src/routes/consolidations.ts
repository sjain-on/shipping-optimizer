import { FastifyInstance } from 'fastify';
import { CreateConsolidationSchema, ApproveConsolidationSchema } from '../schemas.js';
import { prisma } from '../prisma.js';
import { findConsolidatableOrders } from '../services/orderMatching.js';

export async function consolidationRoutes(server: FastifyInstance) {
  server.post('/', async (request, reply) => {
    const { orderIds, customerId, shippingAddressHash } = CreateConsolidationSchema.parse(request.body);

    // Check if consolidation already exists for these orders
    const existingLinks = await prisma.orderLink.findMany({
      where: {
        shopifyOrderId: { in: orderIds },
      },
    });

    if (existingLinks.length > 0) {
      const existingConsolidation = await prisma.consolidation.findUnique({
        where: { id: existingLinks[0].consolidationId },
        include: { orderLinks: true },
      });
      return reply.status(409).send({
        error: 'Consolidation already exists',
        consolidation: existingConsolidation,
      });
    }

    // Create consolidation with order links
    const consolidation = await prisma.$transaction(async (tx: any) => {
      const newConsolidation = await tx.consolidation.create({
        data: {
          status: 'PENDING',
        },
      });

      await tx.orderLink.createMany({
        data: orderIds.map((orderId: string) => ({
          consolidationId: newConsolidation.id,
          shopifyOrderId: orderId,
          shopifyOrderName: `ORDER-${orderId}`, // Will be populated from Shopify later
          customerId,
          addressHash: shippingAddressHash,
        })),
      });

      await tx.auditLog.create({
        data: {
          entityType: 'Consolidation',
          entityId: newConsolidation.id,
          action: 'CREATED',
          actor: 'system',
          diff: JSON.stringify({ orderIds, customerId, shippingAddressHash }),
          consolidationId: newConsolidation.id,
        },
      });

      return newConsolidation;
    });

    const fullConsolidation = await prisma.consolidation.findUnique({
      where: { id: consolidation.id },
      include: { orderLinks: true },
    });

    return reply.status(201).send(fullConsolidation);
  });

  server.post('/:id/approve', async (request, reply) => {
    const { consolidationId: id } = ApproveConsolidationSchema.parse(request.params);

    const consolidation = await prisma.consolidation.findUnique({
      where: { id },
      include: { orderLinks: true },
    });

    if (!consolidation) {
      return reply.status(404).send({ error: 'Consolidation not found' });
    }

    if (consolidation.status !== 'PENDING') {
      return reply.status(400).send({ error: 'Consolidation cannot be approved in current state' });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const updatedConsolidation = await tx.consolidation.update({
        where: { id },
        data: { status: 'APPROVED' },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'Consolidation',
          entityId: id,
          action: 'APPROVED',
          actor: 'admin',
          diff: JSON.stringify({ previousStatus: 'PENDING', newStatus: 'APPROVED' }),
          consolidationId: id,
        },
      });

      return updatedConsolidation;
    });

    return { status: 'approved', consolidation: updated };
  });

  server.post('/:id/reject', async (request, reply) => {
    const { consolidationId: id } = ApproveConsolidationSchema.parse(request.params);

    const consolidation = await prisma.consolidation.findUnique({
      where: { id },
    });

    if (!consolidation) {
      return reply.status(404).send({ error: 'Consolidation not found' });
    }

    if (consolidation.status !== 'PENDING') {
      return reply.status(400).send({ error: 'Consolidation cannot be rejected in current state' });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const updatedConsolidation = await tx.consolidation.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'Consolidation',
          entityId: id,
          action: 'REJECTED',
          actor: 'admin',
          diff: JSON.stringify({ previousStatus: 'PENDING', newStatus: 'CANCELLED' }),
          consolidationId: id,
        },
      });

      return updatedConsolidation;
    });

    return { status: 'rejected', consolidation: updated };
  });

  server.get('/', async (request, reply) => {
    const { page = 1, limit = 20 } = request.query as {
      page?: number;
      limit?: number;
    };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [consolidations, total] = await Promise.all([
      prisma.consolidation.findMany({
        include: { orderLinks: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.consolidation.count(),
    ]);

    return {
      consolidations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  });

  // GET /api/consolidations/suggestions - Get consolidatable order groups
  server.get('/suggestions', async (request, reply) => {
    const groups = await findConsolidatableOrders();

    // Format for frontend
    const suggestions = groups.map((group: any) => ({
      customerEmail: group[0].customerEmail,
      customerName: group[0].customerName,
      addressHash: `${JSON.parse(group[0].shippingAddress).address1}-${JSON.parse(group[0].shippingAddress).city}-${JSON.parse(group[0].shippingAddress).zip}`,
      orderCount: group.length,
      orders: group.map((order: any) => ({
        id: order.id,
        externalOrderId: order.externalOrderId,
        customerName: order.customerName,
        status: order.status,
        createdAt: order.createdAt,
      })),
    }));

    return { suggestions };
  });
}