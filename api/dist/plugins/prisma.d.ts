import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}
declare const _default: (fastify: FastifyInstance) => Promise<void>;
export default _default;
//# sourceMappingURL=prisma.d.ts.map