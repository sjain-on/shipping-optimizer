I have explored the codebase to understand the usage of BullMQ and Redis (via `ioredis`). Here are my findings:

### 1. Locations Importing/Using BullMQ and ioredis

The codebase uses BullMQ and ioredis extensively across two main components: `api` and `worker`.

*   **API (`api/src/`)**:
    *   `api/src/queues/index.ts`: Centralizes connection management, queue definitions, and job submission helpers.
    *   `api/src/queues/ingest-orders-queue.ts`, `match-orders-queue.ts`: Queue-specific helper functions (e.g., `addIngestOrdersJob`, `addRepeatableMatchOrdersJob`).
    *   `api/src/queues/ingest-orders.ts`: Defines the worker for order ingestion.
    *   `api/src/scheduler.ts`: Initializes repeatable cron jobs.
    *   `api/src/server.ts`: Bootstraps the queue connection and scheduler.
    *   `api/src/routes/`: Various routes (e.g., `webhookRoutes`, `orderRoutes`, `shipmentRoutes`) call `addJob` or queue-specific helpers to enqueue tasks.

*   **Worker (`worker/src/`)**:
    *   `worker/src/redis.ts`: Defines the Redis connection.
    *   `worker/src/workers/`: Contains the worker definitions for each queue (`ingestOrders.ts`, `createConsolidation.ts`, `createShipment.ts`, `syncAWB.ts`, `processWebhook.ts`, `processWebhookDLQ.ts`, `matchOrders.ts`, `createFulfillment.ts`).
    *   `worker/src/index.ts`: Bootstraps workers.

### 2. Job Flow

Jobs generally follow this pattern:
1.  **Trigger**: API routes receive a request (webhook or user action) and enqueue a job using `addJob` (or a queue-specific helper). Idempotency keys are generated in the route and checked in Redis before enqueuing.
2.  **Payload**: Job data includes an `idempotencyKey` and specific task parameters.
3.  **Execution**: Workers (running in the `worker` service) process the jobs. They perform business logic, interact with external services (EasyEcom, Quickshift, Shopify), and update the database via Prisma.
4.  **Chaining**: Some jobs enqueue new jobs. For example, `createConsolidation` worker, after processing, calls `addJob(QUEUES.CREATE_SHIPMENT, ...)` to trigger the next step.

### 3. Repeatable/Scheduled Jobs

Scheduled jobs are implemented in `api/src/scheduler.ts`. They use `upsertJobScheduler` (BullMQ v6) in `api/src/queues/ingest-orders-queue.ts` and `api/src/queues/match-orders-queue.ts` to maintain cron-based scheduling.

### 4. Shared Patterns

*   **Idempotency**: Every job carries an `idempotencyKey`. The `addJob` helper checks Redis for existing keys before enqueuing.
*   **Error Handling**: Workers have basic `.on('failed', ...)` listeners for logging. Retries are configured in `addJob` and `defaultJobOptions` (exponential backoff).
*   **State Management**: Prisma is used extensively for state updates (`Consolidation`, `Shipment`, `EasyEcomOrder`, `AuditLog`).

### Prisma Models for Idempotency/Queue State

*   `model IdempotencyKey`: Seems to be used for storing responses or tracking keys (though the current queue implementation relies heavily on Redis for fast idempotency checks).
*   `model AuditLog`: Used to track status changes and system actions.
*   The system also relies on state fields in domain models (e.g., `Consolidation.status`, `Shipment.status`) to manage workflow progress.

---
I have explored the codebase as requested. I skipped modifying any code to actually implement the migration (as per your instructions to only explore) and did not check the infrastructure configuration for the `worker` service deployment, which might be required to fully remove the worker service dependency.
