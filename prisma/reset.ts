import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function resetDatabase() {
  console.log("🧹 Resetting SocietyBuy database...");

  // Delete in reverse dependency order
  await prisma.providerEvent.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.captainCredit.deleteMany({});
  await prisma.referral.deleteMany({});
  await prisma.consent.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.ticketMessage.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.handoverEvent.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.goodsReceiptItem.deleteMany({});
  await prisma.goodsReceipt.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cycleSku.deleteMany({});
  await prisma.cycle.deleteMany({});
  await prisma.quoteSlab.deleteMany({});
  await prisma.supplierQuote.deleteMany({});
  await prisma.benchmarkPrice.deleteMany({});
  await prisma.sku.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.supplierUser.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.flat.deleteMany({});
  await prisma.dropPoint.deleteMany({});
  await prisma.society.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("✅ Database reset successfully.");
}

if (require.main === module) {
  resetDatabase()
    .catch((e) => {
      console.error("❌ Reset error:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
