import { prisma } from '../prisma.js';
export async function findConsolidatableOrders() {
    // Find orders that are confirmed and not yet linked to a consolidation
    // OrderLink uses shopifyOrderId which matches externalOrderId from EasyEcom
    const linkedOrderIds = await prisma.orderLink.findMany({
        select: { shopifyOrderId: true }
    });
    const orders = await prisma.easyEcomOrder.findMany({
        where: {
            status: 'confirmed',
            NOT: {
                externalOrderId: {
                    in: linkedOrderIds.map((l) => l.shopifyOrderId)
                }
            }
        },
    });
    // Group by customerId + shippingAddress (hash)
    const groups = new Map();
    for (const order of orders) {
        // Generate a hash of the shipping address to group by
        const address = JSON.parse(order.shippingAddress);
        const addressHash = `${address.address1}-${address.city}-${address.zip}`;
        const key = `${order.customerEmail}-${addressHash}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(order);
    }
    // Filter groups with > 1 order
    return Array.from(groups.values()).filter(group => group.length > 1);
}
//# sourceMappingURL=orderMatching.js.map