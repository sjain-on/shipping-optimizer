import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

async function auth(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check
    if (request.url.startsWith('/health')) return;

    const apiKey = request.headers['x-api-key'];
    if (!process.env.ADMIN_API_KEY || apiKey !== process.env.ADMIN_API_KEY) {
      await reply.code(401).send({ error: 'Unauthorized' });
    }
  });
}

export const authPlugin = fp(auth);
