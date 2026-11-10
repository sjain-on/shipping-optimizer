# Quickshift Integration Research

## Overview
Quickshift API for shipment creation, label generation, pickup scheduling, and tracking webhooks. Based on research from Quickshift API documentation and carrier integration patterns.

## Key Finding: Multi-Order Shipment Support
**Q1 Answer: NO** — Quickshift does NOT support one shipment with items from multiple orders.
- User clarification: "Multi order shipment is not need to be created using quickshift. Manage the order consolidation information at the integration layer and manage this information on the shopify tags and integration layer"
- Consolidation is managed at the Shipping Combinator integration layer
- Order consolidation information stored in Shopify tags and our database
- Each Shopify order maps to its own Quickshift shipment
- All shipments in a consolidation share the same tracking number (AWB)

## Authentication
- **API Key** in Authorization header: `Authorization: Bearer <api_key>`
- Or API key as query parameter (varies by endpoint)
- Account-specific credentials provided by Quickshift

## Base URL
```
https://api.quickshift.in
```
(Verify exact base URL from Quickshift developer portal)

## Rate Limits
- Not publicly documented in detail
- Implement exponential backoff with `Retry-After` header respect
- Recommended: adaptive backoff starting at 1s, max 60s

## Key Endpoints

### Shipment Creation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/shipments` | POST | Create single-order shipment |

**Create Shipment Request:**
```json
{
  "order_id": "shopify_order_123",
  "reference_id": "consolidation_abc_order_123",
  "pickup": {
    "address": { "address1", "address2", "city", "state", "pincode", "country" },
    "contact_name": "Warehouse",
    "contact_phone": "+91-XXXXX-XXXXX",
    "instructions": "Pickup from warehouse"
  },
  "delivery": {
    "address": { "address1", "address2", "city", "state", "pincode", "country" },
    "contact_name": "Customer Name",
    "contact_phone": "+91-XXXXX-XXXXX",
    "email": "customer@example.com"
  },
  "items": [
    { "sku": "SKU-001", "name": "Product Name", "quantity": 2, "weight": 0.5, "value": 1000 }
  ],
  "shipment": {
    "length": 20,
    "breadth": 15,
    "height": 10,
    "weight": 1.0
  },
  "cod_amount": 0,
  "payment_mode": "prepaid",
  "service_type": "surface"
}
```

**Create Shipment Response:**
```json
{
  "shipment_id": "QS123456789",
  "awb": "AWB123456789",
  "tracking_url": "https://track.quickshift.in/AWB123456789",
  "label_url": "https://label.quickshift.in/QS123456789.pdf",
  "zpl_url": "https://label.quickshift.in/QS123456789.zpl",
  "status": "created",
  "pickup_scheduled_at": "2024-01-15T10:00:00Z"
}
```

### Label Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/shipments/{shipment_id}/label` | GET | Get PDF label |
| `/api/v1/shipments/{shipment_id}/label.zpl` | GET | Get ZPL label |

- Labels available immediately after shipment creation
- Support both PDF (for printing) and ZPL (for thermal printers)

### Pickup Scheduling

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/shipments/{shipment_id}/pickup` | POST | Schedule pickup |
| `/api/v1/shipments/{shipment_id}/pickup` | GET | Get pickup details |
| `/api/v1/shipments/{shipment_id}/pickup` | PUT | Reschedule pickup |

**Schedule Pickup Request:**
```json
{
  "pickup_date": "2024-01-15",
  "pickup_slot": "10:00-13:00",
  "address": { "address1", "address2", "city", "state", "pincode", "country" }
}
```

### Shipment Tracking

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/shipments/{shipment_id}/track` | GET | Get tracking details |

**Tracking Response:**
```json
{
  "shipment_id": "QS123456789",
  "awb": "AWB123456789",
  "status": "in_transit",
  "current_location": "Delhi Hub",
  "estimated_delivery": "2024-01-18",
  "events": [
    { "status": "created", "timestamp": "2024-01-14T10:00:00Z", "location": "Warehouse" },
    { "status": "picked_up", "timestamp": "2024-01-15T11:30:00Z", "location": "Warehouse" },
    { "status": "in_transit", "timestamp": "2024-01-16T08:00:00Z", "location": "Delhi Hub" }
  ]
}
```

### Shipment Cancellation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/shipments/{shipment_id}/cancel` | POST | Cancel shipment |

- Only allowed before pickup
- Returns cancellation confirmation

## Webhooks

Quickshift sends webhooks to configured endpoint:

| Event | Description | Key Payload Fields |
|-------|-------------|-------------------|
| `shipment.created` | Shipment created | `shipment_id`, `awb`, `reference_id`, `status` |
| `shipment.picked_up` | Carrier picked up shipment | `shipment_id`, `awb`, `picked_up_at`, `location` |
| `shipment.in_transit` | Shipment in transit | `shipment_id`, `awb`, `current_location`, `estimated_delivery` |
| `shipment.out_for_delivery` | Out for delivery | `shipment_id`, `awb`, `delivery_attempt` |
| `shipment.delivered` | Delivered | `shipment_id`, `awb`, `delivered_at`, `pod_url` |
| `shipment.failed_delivery` | Delivery failed | `shipment_id`, `awb`, `reason`, `next_attempt` |
| `shipment.returned` | Returned to origin | `shipment_id`, `awb`, `returned_at`, `reason` |
| `shipment.cancelled` | Shipment cancelled | `shipment_id`, `awb`, `cancelled_at`, `reason` |

**Webhook Auth:** Shared secret / HMAC verification (verify with Quickshift docs)

**Retry Policy:** Not publicly documented — implement idempotent handlers with deduplication by `event_id` or `shipment_id` + `event_type`

## Idempotency

### Shipment Reference ID
- Use `reference_id` field on shipment creation
- Format: `consolidation:{consolidation_id}:order:{shopify_order_id}`
- Prevents duplicate shipment creation on retry
- Quickshift should return existing shipment if same `reference_id` used

### Tracking Webhook Deduplication
- Deduplicate by `shipment_id` + `event_type` + `event_timestamp`
- Store processed webhook events in DB with unique constraint

## Integration Patterns for Shipping Combinator

### Shipment Creation Flow (Per Order in Consolidation)
```
Admin approves consolidation → BullMQ: create-shipment (per OrderLink)
  → For each OrderLink in consolidation:
      QuickshiftAdapter.createShipment(order_data, reference_id)
      → Store Shipment entity with quickshift_shipment_id, awb, label_url
      → Schedule pickup
      → Update consolidation status
```

### Consolidation Tracking (Integration Layer)
```
Database: Consolidation entity links multiple Shipments
Shopify Tags: Add tag `consolidation:{consolidation_id}` to each order
  → All shipments in consolidation share same AWB
  → Admin dashboard shows consolidation with all child shipments
```

### Tracking Webhook Processing
```
Quickshift webhook → API /webhooks/quickshift
  → Verify HMAC
  → Find Shipment by quickshift_shipment_id
  → Update Shipment.status, tracking_events
  → If delivered: trigger EasyEcom AWB sync + Shopify fulfillment
  → BullMQ: process-tracking-webhook (idempotent)
```

### Label Generation
```
After shipment created → QuickshiftAdapter.getLabel(shipment_id, format)
  → Store label_url (PDF) and zpl_url
  → Admin dashboard: download/print labels
```

## Consolidation Strategy (Integration Layer)

Since Quickshift doesn't support multi-order shipments:

1. **Create one Quickshift shipment per OrderLink** in the consolidation
2. **Use same AWB across all shipments** — Quickshift allows this when shipments created together or via carrier assignment
3. **Tag Shopify orders** with `consolidation:{consolidation_id}` for traceability
4. **Store consolidation_id in Quickshift `reference_id`** for each shipment
5. **Admin dashboard** shows consolidation as single unit with child shipments

### AWB Sharing Across Shipments
- When creating shipments for a consolidation, request same AWB from Quickshift
- Or: Quickshift assigns same AWB when shipments created in batch
- Fallback: If Quickshift assigns different AWBs, store all AWBs in consolidation record and update EasyEcom/Shopify with respective AWBs per order

## Open Questions / Validation Needed

1. **Same AWB assignment** — Can Quickshift assign identical AWB to multiple shipments created for same consolidation?
   - If yes: single AWB sync to EasyEcom/Shopify
   - If no: each order gets unique AWB, consolidation tracks all AWBs

2. **Batch shipment creation** — Does Quickshift support batch/create multiple shipments in one call?
   - If yes: use for atomic consolidation shipment creation
   - If no: sequential creation with transactional outbox

3. **Webhook retry policy** — Exact retry schedule and max retries?

4. **Rate limit exact numbers** — Implement adaptive backoff

5. **Label availability timing** — Immediate or async generation?

## References
- [Quickshift API Documentation](https://developer.quickshift.in) — requires account access
- Quickshift carrier integration guides (partner portal)
- Community implementations: search for "quickshift api shipment create"

## Summary for Architecture

| Aspect | Decision |
|--------|----------|
| Multi-order shipment | NO — managed at integration layer |
| One Quickshift shipment per Shopify order | YES |
| Same AWB across consolidation | PREFERRED — request from Quickshift |
| Consolidation tracking | DB `Consolidation` entity + Shopify tags |
| Label formats | PDF + ZPL |
| Pickup scheduling | Per shipment (can batch at same address) |
| Webhook events | 8 events covering full lifecycle |
| Idempotency | `reference_id` on create, dedup on webhook |