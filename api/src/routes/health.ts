import { FastifyInstance } from 'fastify';

export async function healthRoute(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
