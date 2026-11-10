export async function healthRoute(fastify) {
    fastify.get('/', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
}
//# sourceMappingURL=health.js.map