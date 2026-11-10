# Shipping Combinator Specification

## Overview

Build a system that consolidates multiple Shopify orders (same customer, same shipping address) into a single Quickshift shipment while maintaining separate orders/invoices in EasyEcom. Critical constraints: admin approval gates for shipments, idempotency keys for all mutations, never modify original orders, never mark shipped before carrier handover.

## Core Requirements

### Order Consolidation
- **Trigger**: Multiple unfulfilled Shopify orders from same customer with identical shipping address
- **Action**: Create a Consolidation entity linking orders (never modify original orders)
- **Admin Gate**: Explicit approval required in dashboard before any shipment creation
- **Output**: Single Quickshift shipment containing line items from all consolidated orders

### Integrations
1. **Shopify** (Admin API GraphQL)
   - Query orders by customer_id, shipping_address, financial_status, fulfillment_status
   - Create fulfillment per order with tracking info (idempotency key per fulfillment)
   - Webhooks: orders/fulfilled, orders/partially_fulfilled, fulfillments/update

2. **EasyEcom**
   - Pull orders by date/status, create orders
   - Separate invoice per order_id
   - Update AWB on orders (same external AWB on multiple orders with separate invoices - Q2)
   - Webhooks: order_created, shipment_updated, invoice_generated

3. **Quickshift**
   - Create shipment with items from multiple orders (Q1: multi-order support?)
   - Label generation (PDF/ZPL), pickup scheduling
   - Tracking webhooks: shipment.picked_up, shipment.in_transit, shipment.delivered

### Idempotency
- Every mutating operation requires client-provided idempotency key
- Keys stored with result for replay protection
- Format: `{operation}:{entity_type}:{entity_id}:{client_nonce}`

### Admin Approval Gates
- No shipment created without explicit admin approval in dashboard
- Direct API calls without approval return 403 with audit log entry
- Dashboard shows pending consolidations with approve/reject actions

### Technical Constraints
- Node.js >= 20, TypeScript strict mode
- Three services: API (Fastify), Worker (BullMQ), Admin UI (Next.js 14 + Tailwind)
- PostgreSQL 16 + Prisma, Redis 7 + BullMQ
- Railway deployment (managed Postgres + Redis, Dockerfile per service)
- Single API key auth via ADMIN_API_KEY env var (no RBAC for MVP)
- Adapter pattern for all integrations with mock implementations
- Transactional Outbox for exactly-once processing
- Dual-write prevention via idempotency + transactional outbox

## Review Focus (Risk Register)

1. **Duplicate consolidation attempts** — same order pair submitted twice → second returns existing consolidation, no new shipment
2. **Partial fulfillment webhook race** — Shopify webhook arrives before Quickshift tracking webhook → order shows partially fulfilled correctly
3. **EasyEcom AWB collision** — same AWB applied to multiple orders → each order gets own invoice with same AWB (if supported) or separate AWBs (if not)
4. **Quickshift multi-order failure** — if Quickshift rejects multi-order shipment → fall back to per-order shipments, alert admin
5. **Admin approval bypass** — direct API call without approval → 403, audit log entry

## Open Questions

1. **Q1**: Does Quickshift support one shipment with items from multiple orders?
2. **Q2**: Does EasyEcom allow the same external AWB on multiple orders with separate invoices?

## Architecture Overview

```
Shopify → API (ingest webhooks) → Worker (match/consolidate) → Admin UI (approve)
    ↑                                                           ↓
    └──────── EasyEcom (AWB sync) ← Worker (ship) ← Quickshift ←┘
```

### Data Model (Prisma)
- Consolidation: id, status, customer_id, address_hash, approved_at, approved_by
- OrderLink: consolidation_id, shopify_order_id, easyecom_order_id, line_items
- Shipment: id, consolidation_id, quickshift_shipment_id, status, labels_url, awb
- AWBSync: shipment_id, easyecom_order_id, awb, status
- Fulfillment: shopify_order_id, shipment_id, tracking_number, status
- AuditLog: entity_type, entity_id, action, actor, timestamp, diff
- IdempotencyKey: key, operation, result, created_at

### BullMQ Jobs
- ingest-orders (cron + manual)
- match-orders
- create-consolidation (triggered by approval)
- create-shipment (after admin approval)
- sync-awb (per order)
- create-fulfillment (per order)
- process-tracking-webhook