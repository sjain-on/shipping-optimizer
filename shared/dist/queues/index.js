"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUES = void 0;
// Queue names
exports.QUEUES = {
    INGEST_ORDERS: 'ingest-orders',
    MATCH_ORDERS: 'match-orders',
    CREATE_CONSOLIDATION: 'create-consolidation',
    CREATE_SHIPMENT: 'create-shipment',
    SYNC_AWB: 'sync-awb',
    CREATE_FULFILLMENT: 'create-fulfillment',
    PROCESS_WEBHOOK: 'process-webhook',
    PROCESS_WEBHOOK_DLQ: 'process-webhook-dlq',
    RETRY_FAILED: 'retry-failed',
};
//# sourceMappingURL=index.js.map