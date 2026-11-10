import fastify from 'fastify';
import { authPlugin } from './plugins/auth.js';
import { healthRoute } from './routes/health.js';
import { consolidationRoutes } from './routes/consolidations.js';
import { shipmentRoutes } from './routes/shipments.js';
import { orderRoutes } from './routes/orders.js';
import { webhookRoutes } from './routes/webhooks.js';
import { auditLogRoutes } from './routes/auditLogs.js';

const server = fastify({ logger: true });

// Register plugins
server.register(authPlugin);

// Register routes
server.register(healthRoute, { prefix: '/health' });
server.register(consolidationRoutes, { prefix: '/consolidations' });
server.register(shipmentRoutes, { prefix: '/shipments' });
server.register(orderRoutes, { prefix: '/orders' });
server.register(webhookRoutes, { prefix: '/webhooks' });
server.register(auditLogRoutes, { prefix: '/audit-logs' });

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
