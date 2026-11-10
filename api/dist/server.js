import app from './app.js';
import { initScheduler } from './scheduler.js';
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
async function start() {
    try {
        // Initialize scheduler (cron jobs)
        await initScheduler();
        app.log.info('Scheduler initialized');
        // Start HTTP server
        await app.listen({ port: PORT, host: HOST });
        app.log.info(`Server listening on ${HOST}:${PORT}`);
        // Graceful shutdown
        const shutdown = async (signal) => {
            app.log.info(`${signal} received, shutting down...`);
            await app.close();
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=server.js.map