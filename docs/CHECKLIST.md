# Implementation Checklist

## Open questions
- [x] Does Quickshift support one shipment with items from multiple orders? → **NO** (managed at integration layer with Shopify tags, per integration research)
- [x] Does EasyEcom allow the same external AWB on multiple orders with separate invoices? → **YES** (supported by EasyEcom API; each order has unique `invoice_id`, same `awb` value accepted across multiple `updateTrackingStatus` calls)

## Decisions log
- Railway, API-key auth, full pipeline MVP (see CLAUDE.md)

## Phases
- [ ] 1. Docs review: architecture, DB schema, integration contracts (docs/integrations/*.md)
- [ ] 2. Database, backend skeleton, admin dashboard shell
- [ ] 3. EasyEcom order ingestion
- [ ] 4. Order matching and manual consolidation
- [ ] 5. Quickshift shipment creation (after admin approval)
- [ ] 6. EasyEcom AWB sync
- [ ] 7. Shopify per-order fulfilments
- [ ] 8. Tracking webhooks, retries, audit logs
- [ ] 9. Deployment on Railway, README, e2e tests

## Phase notes
