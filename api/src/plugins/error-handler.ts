import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

export default fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    fastify.log.error(error);

    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request payload',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
      const prismaError = error as any;
      if (prismaError.code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'A record with this value already exists',
          field: prismaError.meta?.target,
        });
      }
      if (prismaError.code === 'P2025') {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Record not found',
        });
      }
    }

    // Custom application errors
    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.name || 'Error',
        message: error.message,
      });
    }

    // Default 500
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
    });
  });
});