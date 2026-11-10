
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.easyEcomOrder.count();
  console.log('EasyEcomOrder count:', count);
  const orders = await prisma.easyEcomOrder.findMany();
  console.log('Orders:', orders);
}
main().catch(console.error).finally(() => prisma.$disconnect());
