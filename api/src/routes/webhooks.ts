import { FastifyInstance } from 'fastify';
import { prisma } from '../prisma.js';
import { syncShipmentAWB } from '../services/shipment.js';
import { createEasyEcomAdapter } from '@shipping-combinator/shared';
import crypto from 'crypto';

function verifyHmacSignature(secret: string, payload: string, signature: string, headerName: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function webhookRoutes(server: FastifyInstance) {
  server.post('/quickshift', async (request, reply) => {
    const qsSecret = process.env.QUICKSHIFT_WEBHOOK_SECRET;
    if (qsSecret) {
      const signature = request.headers['x-quickshift-signature'] as string;
      const payload = JSON.stringify(request.body);
      if (!signature || !verifyHmacSignature(qsSecret, payload, signature, 'x-quickshift-signature')) {
        return reply.status(401).send({ error: 'Invalid signature' });
      }
    }
    const body = request.body as { shipmentId?: string; status?: string; [key: string]: any };

    // Process webhook synchronously
    if (body.shipmentId && body.status) {
      try {
        // Find the shipment by external ID or AWB with orderLink relation
        const shipment = await prisma.shipment.findFirst({
          where: { awb: body.shipmentId },
          include: { orderLink: true },
        });

        if (shipment) {
          // Update shipment status based on webhook
          const statusMap: Record<string, string> = {
            'delivered': 'DELIVERED',
            'in_transit': 'IN_TRANSIT',
            'returned': 'RETURNED',
            'cancelled': 'CANCELLED',
          };

          if (statusMap[body.status]) {
            await prisma.shipment.update({
              where: { id: shipment.id },
              data: { status: statusMap[body.status] },
            });

            await prisma.auditLog.create({
              data: {
                entityType: 'Shipment',
                entityId: shipment.id,
                action: 'WEBHOOK_STATUS_UPDATE',
                actor: 'webhook:quickshift',
                diff: JSON.stringify({ status: body.status, previousStatus: shipment.status }),
                consolidationId: shipment.orderLink?.consolidationId,
              },
            });
          }
        }

        return { status: 'processed' };
      } catch (error) {
        console.error('Quickshift webhook processing error:', error);
        return reply.status(500).send({ error: 'Failed to process webhook' });
      }
    }

    return { status: 'ignored', reason: 'Missing shipmentId or status' };
  });

  server.post('/easyecom', async (request, reply) => {
    const eeSecret = process.env.EASYECOM_WEBHOOK_SECRET;
    if (eeSecret) {
      const signature = request.headers['x-easyecom-signature'] as string;
      const payload = JSON.stringify(request.body);
      if (!signature || !verifyHmacSignature(eeSecret, payload, signature, 'x-easyecom-signature')) {
        return reply.status(401).send({ error: 'Invalid signature' });
      }
    }
    const body = request.body as { externalOrderId?: string; status?: string; awb?: string; invoiceId?: string; [key: string]: any };

    // Process webhook synchronously
    if (body.externalOrderId && body.status && body.awb && body.invoiceId) {
      try {
        // Find the order by externalOrderId
        const order = await prisma.easyEcomOrder.findUnique({
          where: { externalOrderId: body.externalOrderId },
        });

        if (order) {
          // Find the order link by invoiceId (assuming it links to OrderLink)
          // Since EasyEcomOrder does not link to OrderLink in schema, we have to find OrderLink differently
          // Or just ignore for now as we don't have the relation.
          return { status: 'ignored', reason: 'Order found but cannot link to Shipment' };
        }

        return { status: 'ignored', reason: 'Order not found or not linked to shipment' };
      } catch (error) {
        console.error('EasyEcom webhook processing error:', error);
        return reply.status(500).send({ error: 'Failed to process webhook' });
      }
    }

    return { status: 'ignored', reason: 'Missing required fields' };
  });

  server.post('/shopify', async (request, reply) => {
    const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (shopifySecret) {
      const signature = request.headers['x-shopify-hmac-sha256'] as string;
      const payload = JSON.stringify(request.body);
      if (!signature || !verifyHmacSignature(shopifySecret, payload, signature, 'x-shopify-hmac-sha256')) {
        return reply.status(401).send({ error: 'Invalid signature' });
      }
    }
    const body = request.body as { [key: string]: any };

    // Process Shopify webhook synchronously
    // Common events: orders/fulfilled, orders/created, fulfillments/create
    const topic = request.headers['x-shopify-topic'] as string;

    if (topic === 'fulfillments/create' || topic === 'fulfillments/update') {
      // Handle fulfillment creation/update
      const fulfillment = body;
      if (fulfillment.order_id && fulfillment.tracking_number) {
        try {
          // Find order link by shopify order ID
          const orderLink = await prisma.orderLink.findUnique({
            where: { shopifyOrderId: `gid://shopify/Order/${fulfillment.order_id}` },
            include: { shipments: true },
          });

          if (orderLink && orderLink.shipments.length > 0) {
            await syncShipmentAWB(orderLink.shipments[0].id, fulfillment.tracking_number);
            return { status: 'processed' };
          }
        } catch (error) {
          console.error('Shopify fulfillment webhook processing error:', error);
          return reply.status(500).send({ error: 'Failed to process webhook' });
        }
      }
    }

    return { status: 'ignored', reason: `Unhandled topic: ${topic}` };
  });
}