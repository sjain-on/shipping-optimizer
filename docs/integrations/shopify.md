# Shopify Integration Research

## Overview
Shopify Admin API (GraphQL) for order querying, fulfillment creation, and webhook handling.

## Order Querying

### Query: `orders`
Filter orders using the `query` argument:

| Filter | Description | Example |
|--------|-------------|---------|
| `customer_id` | Filter by customer ID | `customer_id:12345` |
| `email` | Filter by customer email | `email:customer@example.com` |
| `financial_status` | Filter by payment status | `financial_status:paid` |
| `fulfillment_status` | Filter by fulfillment state | `fulfillment_status:unfulfilled` |

**Financial Status Values:** `paid`, `pending`, `authorized`, `partially_paid`, `partially_refunded`, `refunded`, `voided`, `expired`

**Fulfillment Status Values:** `unshipped`, `shipped`, `fulfilled`, `partial`, `scheduled`, `on_hold`, `unfulfilled`, `request_declined`

### Shipping Address
- **Not available as a query filter**
- Must be returned as a field: `shippingAddress { address1 address2 city provinceCode zip countryCode }`
- Address matching for consolidation must be done client-side after fetching orders

### Example Query
```graphql
query GetOrders($query: String!) {
  orders(first: 50, query: $query) {
    edges {
      node {
        id
        name
        customer { id email }
        shippingAddress { address1 address2 city provinceCode zip countryCode }
        financialStatus
        fulfillmentStatus
        lineItems(first: 100) {
          edges {
            node { id sku title quantity variant { id sku } }
          }
        }
      }
    }
  }
}
```

## Fulfillment Creation

### Mutation: `fulfillmentCreate`
Creates a fulfillment for one or more `FulfillmentOrder` objects associated with the same Order and Location.

**Arguments:**
- `fulfillment` (FulfillmentInput!) - Required
  - `lineItemsByFulfillmentOrder` - Array of fulfillment order line items
  - `trackingInfo` - Tracking number, URL, company
  - `notifyCustomer` - Boolean
- `message` (String) - Optional message

**Required Scopes:**
- `write_assigned_fulfillment_orders`
- `write_merchant_managed_fulfillment_orders`
- `write_third_party_fulfillment_orders`

**User Permission:** `fulfill_and_ship_orders`

### Idempotency Keys
**Shopify does NOT provide native idempotency keys for fulfillmentCreate.**

**Mitigation:** Store our own idempotency key (`fulfillment:{shopify_order_id}:{client_nonce}`) and:
1. Check if fulfillment already exists for the order with same tracking number before creating
2. On webhook receipt, deduplicate by idempotency key
3. Use `fulfillmentOrders` query to find existing fulfillments for an order

### Tracking Information
```json
{
  "trackingNumber": "AWB123456789",
  "trackingUrl": "https://track.quickshift.com/AWB123456789",
  "trackingCompany": "Quickshift"
}
```

## Webhooks

| Topic | GraphQL Enum | Description | Required Scopes |
|-------|--------------|-------------|-----------------|
| `orders/fulfilled` | `ORDERS_FULFILLED` | Order fully fulfilled | `read_orders`, `read_marketplace_orders` |
| `orders/partially_fulfilled` | `ORDERS_PARTIALLY_FULFILLED` | Order partially fulfilled | `read_orders`, `read_marketplace_orders` |
| `fulfillments/update` | `FULFILLMENTS_UPDATE` | Fulfillment updated | `read_fulfillments`, `read_marketplace_orders` |

## Rate Limits
- **GraphQL:** Calculated query cost (points-based)
- **REST:** Request-based bucket with headers (`X-Shopify-Shop-Api-Call-Limit`)
- **Leaky bucket algorithm** - continuous leak at restore rate
- **Recommended:** Implement exponential backoff, respect `Retry-After` header

## Authentication
- **Private App Token** (Admin API access token)
- Scopes needed: `read_orders`, `write_fulfillments`, `read_fulfillments`
- Or OAuth for installed apps

## Key Findings for Consolidation Use Case

1. **Address matching must be client-side** - shipping address not filterable in query
2. **No native idempotency** - must implement application-level deduplication
3. **One fulfillment per order** - fulfillmentCreate operates on one order at a time
4. **Same tracking number OK** - can use identical tracking number across multiple order fulfillments
5. **Webhook race condition** - `orders/partially_fulfilled` may fire before Quickshift tracking webhook

## References
- [Orders Query](https://shopify.dev/docs/api/admin-graphql/latest/queries/orders)
- [FulfillmentCreate Mutation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fulfillmentCreate)
- [Rate Limits](https://shopify.dev/docs/api/usage/rate-limits)
- [Webhook Topics](https://shopify.dev/docs/api/admin-graphql/latest/enums/WebhookSubscriptionTopic)