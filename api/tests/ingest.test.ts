import { expect, test, beforeAll, afterAll, describe } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../src/test-utils.js';
import { prisma } from '../src/prisma.js';

describe('Order Ingestion Integration', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
    // Clear relevant tables
    await prisma.easyEcomOrder.deleteMany({});
  });

  afterAll(async () => {
    await server.close();
    await prisma.$disconnect();
  });

  test('POST /api/orders/ingest should ingest orders synchronously', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/orders/ingest',
      payload: { fromDate: '2026-11-01' },
    });

    console.log('Response status:', response.statusCode);
    console.log('Response body:', response.body);

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('ordersIngested');

    // Verify orders exist in DB
    const orders = await prisma.easyEcomOrder.findMany();
    expect(orders.length).toBeGreaterThan(0);
  });
});
