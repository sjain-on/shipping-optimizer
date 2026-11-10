# EasyEcom Integration Research

## Overview
EasyEcom API for order ingestion, order creation, AWB/tracking synchronization, and webhook handling. Based on research from support.easyecom.io knowledge base articles and API documentation references.

## Authentication

### Current Auth (since July 2023)
- **JWT Token** + **X-API-Key** — both required in request headers
- JWT Token: 90-day validity, generated via Authorization API function
- X-API-Key: static per client location
- HTTP 401 if either missing

### Legacy Auth (pre-July 2023)
- API token only (deprecated)

## Base URL
```
https://api.easyecom.io
```

## Rate Limits
- **Rate limiting at X-API-Key level**
- HTTP 429 when quota exceeded
- Per-location token isolation (each location has unique API token)
- Exact quota numbers not publicly documented — implement exponential backoff with `Retry-After` header respect

## Key Endpoints

### Order Ingestion / Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/orders/getAllOrdersV2` | POST | Pull orders by date range, status, marketplace, warehouse |
| `/api/v2/orders/getOrderDetails` | POST | Fetch single order by order_id or invoice_id |

**getAllOrdersV2 Parameters:**
```json
{
  "date_from": "2024-01-01",
  "date_to": "2024-01-31",
  "status": "unfulfilled|processing|shipped|delivered|cancelled",
  "marketplace": "shopify|amazon|flipkart|...",
  "warehouse_id": "optional",
  "page": 1,
  "limit": 100
}
```

**Response includes:**
- `order_id` (EasyEcom internal)
- `invoice_id` — **unique per order**, used as "Order Number" for carrier integrations
- `external_order_id` — client-provided (Shopify order ID)
- `customer` info, `shipping_address`, `line_items`, `financial_status`, `fulfillment_status`

### Order Creation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/orders/createOrder` | POST | Create order in EasyEcom |

**createOrder Parameters:**
```json
{
  "external_order_id": "shopify_order_123",
  "invoice_id": "INV-001",  // must be unique per order
  "customer": { "email", "phone", "name" },
  "shipping_address": { "address1", "address2", "city", "state", "pincode", "country" },
  "line_items": [{ "sku", "qty", "price", "tax" }],
  "financial_status": "paid",
  "warehouse_id": "wh_123"
}
```

**Key Finding:** `invoice_id` is **unique per order** — each Shopify order gets its own invoice in EasyEcom. This matches the requirement: separate orders/invoices in EasyEcom.

### Shipment Creation (Carrier Integration)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/shipments/createShipment` | POST | Create shipment, receive AWB + label from carrier |

**Flow (carrier perspective):**
1. EasyEcom posts order JSON to carrier's `createShipment` endpoint
2. Carrier returns `{ awb: "AWB123", label_url: "https://...", tracking_url: "https://..." }`
3. EasyEcom stores AWB against the order/shipment

**From our perspective (calling EasyEcom):**
- We create shipment in Quickshift first
- Then call EasyEcom to **update AWB** on existing orders

### AWB / Tracking Update

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/shipments/updateTrackingStatus` | POST | Update tracking status on order/shipment |
| `/api/v2/shipments/updateQC` | POST | Move shipment to "Ready to Ship" (QC passed) |

**updateTrackingStatus Parameters:**
```json
{
  "invoice_id": "INV-001",  // or order_id
  "awb": "AWB123456789",
  "tracking_url": "https://track.quickshift.com/AWB123456789",
  "carrier": "Quickshift",
  "status": "picked_up|in_transit|delivered|returned|exception"
}
```

**updateQC Parameters:**
```json
{
  "invoice_id": "INV-001",
  "qc_status": "passed"
}
```

### Invoice Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/invoices/generateInvoice` | POST | Generate GST invoice for order |

- Triggered automatically on order creation or manually
- One invoice per `invoice_id` (one per order)
- Invoice contains AWB if already updated

## Webhooks

EasyEcom sends webhooks to configured URLs (per location/warehouse):

| Event | Payload Key Fields |
|-------|-------------------|
| `order_created` | `order_id`, `invoice_id`, `external_order_id`, `status` |
| `order_updated` | `order_id`, `invoice_id`, `status`, `changed_fields` |
| `shipment_created` | `shipment_id`, `order_id`, `awb`, `carrier` |
| `shipment_updated` | `shipment_id`, `awb`, `status`, `tracking_url` |
| `invoice_generated` | `invoice_id`, `order_id`, `pdf_url` |
| `inventory_updated` | `sku`, `warehouse_id`, `available_qty` |

**Webhook Auth:** Shared secret in header (verify HMAC)

**Retry Policy:** Not publicly documented — implement idempotent webhook handlers with deduplication by `event_id`

## Idempotency

### External Order ID
- `external_order_id` field on order creation — use Shopify order ID
- Prevents duplicate order creation on re-ingestion
- **Format:** `ext_ord:{shopify_order_id}`

### External AWB
- EasyEcom appears to support `external_awb` field (carrier-provided)
- Same AWB can be sent for multiple orders if carrier assigns same tracking number
- **Q2 Answer (Pending):** Does EasyEcom allow same external AWB on multiple orders with separate invoices?
  - **Evidence suggests YES** — carrier integrations return AWB per shipment; if one Quickshift shipment covers multiple orders, same AWB would be pushed to each order's `updateTrackingStatus` call with different `invoice_id`
  - Each order has unique `invoice_id` → separate invoices
  - Same `awb` field value across multiple calls should work
  - **Requires validation during implementation**

## Integration Patterns for Shipping Combinator

### Order Ingestion Flow
```
Cron (every 15 min) → BullMQ: ingest-orders
  → EasyEcomAdapter.getAllOrdersV2(date_from, status: unfulfilled)
  → For each order: upsert by external_order_id (Shopify order ID)
  → Store in DB with easyecom_order_id, invoice_id, line_items
```

### AWB Sync Flow (Post-Shipment)
```
Quickshift shipment created → BullMQ: sync-awb (per order in consolidation)
  → For each OrderLink in consolidation:
      EasyEcomAdapter.updateTrackingStatus(invoice_id, awb, tracking_url, carrier, status)
  → Record AWBSync entity per order with status
  → On failure: retry with exponential backoff, max 5, dead letter
```

### Invoice Verification
```
After AWB sync → EasyEcomAdapter.getOrderDetails(invoice_id)
  → Verify invoice generated with correct AWB
  → Update AWBSync.invoice_verified = true
```

## Open Questions / Validation Needed

1. **Q2: Same AWB on multiple orders with separate invoices?**
   - Theory: YES — each `updateTrackingStatus` call uses different `invoice_id` but same `awb`
   - Must validate during Phase 6 implementation
   - Fallback: If not supported, generate unique AWB per order (Quickshift sub-shipments) and link via `consolidation_id`

2. **Rate limit exact numbers** — implement adaptive backoff

3. **Webhook retry policy** — design idempotent handlers regardless

4. **Bulk AWB update?** — No bulk endpoint found; must call per order

## References
- [EasyEcom API Docs](https://api-docs.easyecom.io) — main reference (requires auth)
- [API Modifications V2.1](https://support.easyecom.io/portal/en/kb/articles/easyecom-api-modifications) — auth changes
- [Integrating Carrier Partners](https://support.easyecom.io/portal/en/kb/articles/integrating-carrier-partners-using-easyecom-standard-apis) — shipment flow
- [Integrating Marketplace](https://support.easyecom.io/portal/en/kb/articles/integrating-marketplace-using-easyecom-standard-apis) — webhooks
- [GitHub: ecommerce_super endpoints](https://github.com/incirco/ecommerce_super/blob/main/ecommerce_super/easyecom/client/endpoints.py) — community implementation reference