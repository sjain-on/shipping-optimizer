import fastify from 'fastify';
import prismaPlugin from './plugins/prisma.js';
import errorHandler from './plugins/error-handler.js';
import { orderRoutes } from './routes/orders.js';
import { consolidationRoutes } from './routes/consolidations.js';
import { shipmentRoutes } from './routes/shipments.js';
import { webhookRoutes } from './routes/webhooks.js';
import { auditLogRoutes } from './routes/auditLogs.js';
import { healthRoute } from './routes/health.js';

export async function buildServer() {
  const app = fastify({
    logger: {
      level: 'silent',
    },
  });

  // Register plugins
  await app.register(prismaPlugin);
  await app.register(errorHandler);

  // Register routes
  await app.register(healthRoute);
  await app.register(orderRoutes, { prefix: '/api/orders' });
  await app.register(consolidationRoutes, { prefix: '/api/consolidations' });
  await app.register(shipmentRoutes, { prefix: '/api/shipments' });
  await app.register(webhookRoutes, { prefix: '/api/webhooks' });
  await app.register(auditLogRoutes, { prefix: '/api/audit-logs' });

  await app.ready();

  return app;
}