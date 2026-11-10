import fastify from 'fastify';
import prismaPlugin from './plugins/prisma.js';
import errorHandler from './plugins/error-handler.js';

const app = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins
app.register(prismaPlugin);
app.register(errorHandler);

// Basic health check route
app.get('/health', async () => {
  return { status: 'ok' };
});

export default app;
