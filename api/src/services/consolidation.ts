import { prisma } from '../prisma.js';

export async function createConsolidationDraft(orders: { externalOrderId: string, customerEmail: string, shippingAddress: string }[]) {
  // 1. Create Consolidation record (status PENDING by default)
  const consolidation = await prisma.consolidation.create({
    data: {
      status: 'PENDING',
    },
  });

  // 2. Fetch full order details from DB to get rawData
  const externalOrderIds = orders.map(o => o.externalOrderId);
  const fullOrders = await prisma.easyEcomOrder.findMany({
    where: {
      externalOrderId: { in: externalOrderIds },
    },
  });

  // Create a map for quick lookup
  const orderMap = new Map<string, { externalOrderId: string; rawData: string }>(
    fullOrders.map((o: { externalOrderId: string; rawData: string }) => [o.externalOrderId, { externalOrderId: o.externalOrderId, rawData: o.rawData }])
  );

  // 3. Create OrderLinks for each order with proper data
  await prisma.orderLink.createMany({
    data: orders.map(order => {
      const address = JSON.parse(order.shippingAddress);
      const addressHash = `${address.address1}-${address.city}-${address.zip}`;

      // Get full order from DB for rawData
      const fullOrder = orderMap.get(order.externalOrderId);

      // Try to get order name from rawData
      let shopifyOrderName = order.externalOrderId;
      if (fullOrder) {
        try {
          const raw = JSON.parse(fullOrder.rawData as string);
          shopifyOrderName = raw.order_name || raw.name || order.externalOrderId;
        } catch {
          // Use externalOrderId as fallback
        }
      }

      return {
        consolidationId: consolidation.id,
        shopifyOrderId: order.externalOrderId,
        shopifyOrderName,
        customerId: order.customerEmail,
        addressHash,
      };
    }),
  });

  return consolidation;
}