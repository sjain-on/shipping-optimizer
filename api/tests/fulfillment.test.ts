import { expect, test, beforeAll, afterAll, describe } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../src/test-utils.js';
import { prisma } from '../src/prisma.js';

describe('Shipment Fulfillment Integration', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
    // Clear relevant tables (order matters due to FK constraints)
    await prisma.shipment.deleteMany({});
    await prisma.aWBSync.deleteMany({});
    await prisma.orderLink.deleteMany({});
    await prisma.consolidation.deleteMany({});
  });

  afterAll(async () => {
    await server.close();
    await prisma.$disconnect();
  });

  test('Full fulfillment flow', async () => {
    // 1. Create Consolidation
    const consolidation = await prisma.consolidation.create({
      data: {
        status: 'APPROVED',
        orderLinks: {
          create: {
            shopifyOrderId: 'gid://shopify/Order/1001',
            shopifyOrderName: '#1001',
            customerId: 'gid://shopify/Customer/5001',
            addressHash: 'hash1',
          },
        },
      },
      include: { orderLinks: true },
    });

    const orderLink = consolidation.orderLinks[0];

    // 2. Create Shipment
    const shipmentResponse = await server.inject({
      method: 'POST',
      url: '/api/shipments',
      payload: { consolidationId: consolidation.id },
    });

    expect(shipmentResponse.statusCode).toBe(201);
    const { shipments } = JSON.parse(shipmentResponse.body);
    const shipmentId = shipments[0].id;

    // 3. Sync AWB
    const awbResponse = await server.inject({
      method: 'POST',
      url: `/api/shipments/${shipmentId}/sync-awb`,
      payload: { awb: 'QS123456' },
    });

    expect(awbResponse.statusCode).toBe(200);

    // 4. Fulfill
    const fulfillResponse = await server.inject({
      method: 'POST',
      url: `/api/shipments/${shipmentId}/fulfill`,
    });

    expect(fulfillResponse.statusCode).toBe(200);
    const data = JSON.parse(fulfillResponse.body);
    expect(data.status).toBe('fulfilled');

    // Verify DB update
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
    expect(shipment?.status).toBe('FULFILLED');
  });
});
