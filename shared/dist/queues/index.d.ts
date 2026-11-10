export interface JobData {
    idempotencyKey: string;
    [key: string]: any;
}
export interface JobResult {
    success: boolean;
    data?: any;
    error?: string;
}
export declare const QUEUES: {
    readonly INGEST_ORDERS: "ingest-orders";
    readonly MATCH_ORDERS: "match-orders";
    readonly CREATE_CONSOLIDATION: "create-consolidation";
    readonly CREATE_SHIPMENT: "create-shipment";
    readonly SYNC_AWB: "sync-awb";
    readonly CREATE_FULFILLMENT: "create-fulfillment";
    readonly PROCESS_WEBHOOK: "process-webhook";
    readonly PROCESS_WEBHOOK_DLQ: "process-webhook-dlq";
    readonly RETRY_FAILED: "retry-failed";
};
export type QueueName = typeof QUEUES[keyof typeof QUEUES];
//# sourceMappingURL=index.d.ts.map