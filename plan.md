# Shipping Combinator Work Breakdown

## Phase 1: Docs Review (COMPLETE)
- [x] Architecture, DB schema, integration contracts documented

## Phase 2: Database, Backend Skeleton, Admin Dashboard Shell
**Agent: backend-architect (1 agent)**
- Prisma schema from ARCHITECTURE.md
- Fastify app with plugin structure, Zod validation, error handling
- BullMQ setup with Redis connection, job types
- Next.js + Tailwind admin shell with API key auth middleware
- Dockerfiles for api, worker, admin
- Railway service configs

## Phase 3: EasyEcom Order Ingestion
**Agent: integration-engineer (1 agent)**
- EasyEcomAdapter with mock + real impl
- BullMQ job: ingest-orders (cron + manual trigger)
- Idempotency on external_order_id
- Admin dashboard: orders table, sync status, manual re-ingest

## Phase 4: Order Matching and Manual Consolidation
**Agent: backend-engineer (1 agent)**
- Matching algorithm: same customer_id + shipping_address_hash + unfulfilled
- Consolidation entity creation with admin approval flag
- Admin dashboard: consolidation review, approve/reject, edit line items
- BullMQ job: create-consolidation (triggered by approval)

## Phase 5: Quickshift Shipment Creation
**Agent: integration-engineer (1 agent)**
- QuickshiftAdapter with multi-order or fallback logic (per Q1 answer)
- BullMQ job: create-shipment (after admin approval)
- Label generation, pickup scheduling
- Admin dashboard: shipment status, labels, tracking link

## Phase 6: EasyEcom AWB Sync
**Agent: integration-engineer (1 agent)**
- AWB sync job: update orders with AWB (per Q2 answer)
- Invoice verification per order
- Admin dashboard: AWB sync status per order, retry failed

## Phase 7: Shopify Per-Order Fulfilments
**Agent: integration-engineer (1 agent)**
- ShopifyAdapter fulfillment create per order
- Idempotency key per fulfillment
- Admin dashboard: fulfillment status per order, retry failed

## Phase 8: Tracking Webhooks, Retries, Audit Logs
**Agent: backend-engineer (1 agent)**
- Webhook endpoints: Quickshift tracking, EasyEcom shipment, Shopify fulfillment
- Retry policy: exponential backoff, max 5, dead letter queue
- Audit log: every state change with actor, timestamp, diff
- Admin dashboard: audit log viewer, filter by consolidation/shipment/order

## Phase 9: Deployment on Railway, README, E2E Tests
**Agent: devops-engineer (1 agent)**
- Railway project setup, managed Postgres + Redis
- CI/CD: GitHub Actions → Railway deploy
- README: setup, env vars, local dev, deployment
- E2E tests: Playwright for admin flow, Vitest for unit/integration
- Smoke test script for production verification