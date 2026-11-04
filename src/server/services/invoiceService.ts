import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";
import { generateTaxInvoiceData, ComputedInvoice } from "@/server/domain/taxInvoice";

export async function generateResidentInvoice(orderId: string): Promise<ComputedInvoice> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      society: true,
      flat: true,
      cycle: true,
      items: {
        include: {
          sku: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
        },
      },
      invoices: true,
    },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  // Generate invoice number if not already present
  const invoiceNumber = `INV-${order.cycle.name.slice(0, 3).toUpperCase()}-${order.pickupCode}`;

  const lineItems = order.items.map((item) => ({
    skuId: item.skuId,
    productName: `${item.sku.product.brand} - ${item.sku.product.name}`,
    variantName: item.sku.variantName,
    hsnCode: item.sku.product.hsnCode || "19019090",
    gstRatePercent: Number(item.sku.product.gstRate) || 5,
    quantity: item.quantity,
    unitPricePaise: item.finalPricePaise ?? item.guaranteedPricePaise,
    shortSuppliedQty: item.shortSuppliedQty,
  }));

  const invoiceData = generateTaxInvoiceData(invoiceNumber, lineItems, false);

  // Upsert invoice in database
  await prisma.invoice.upsert({
    where: { invoiceNumber },
    update: {
      totalTaxablePaise: invoiceData.totalTaxablePaise,
      totalCgstPaise: invoiceData.totalCgstPaise,
      totalSgstPaise: invoiceData.totalSgstPaise,
      totalIgstPaise: invoiceData.totalIgstPaise,
      totalAmountPaise: invoiceData.totalAmountPaise,
      invoiceData: invoiceData as any,
    },
    create: {
      invoiceNumber,
      orderId: order.id,
      totalTaxablePaise: invoiceData.totalTaxablePaise,
      totalCgstPaise: invoiceData.totalCgstPaise,
      totalSgstPaise: invoiceData.totalSgstPaise,
      totalIgstPaise: invoiceData.totalIgstPaise,
      totalAmountPaise: invoiceData.totalAmountPaise,
      invoiceData: invoiceData as any,
    },
  });

  return invoiceData;
}

export async function createCreditNote(
  actorId: string,
  orderId: string,
  refundAmountPaise: number,
  reason: string,
  shortItems: { skuId: string; shortQty: number; unitPricePaise: number }[]
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      invoices: true,
      items: {
        include: { sku: { include: { product: true } } },
      },
    },
  });

  if (!order) throw new Error("Order not found.");

  const origInvoice = order.invoices[0];
  const origInvoiceNum = origInvoice ? origInvoice.invoiceNumber : `INV-${order.pickupCode}`;
  const creditNoteNumber = `CN-${order.pickupCode}-${Date.now().toString().slice(-4)}`;

  const lineInputs = shortItems.map((si) => {
    const matched = order.items.find((i) => i.skuId === si.skuId);
    return {
      skuId: si.skuId,
      productName: matched
        ? `${matched.sku.product.brand} - ${matched.sku.product.name}`
        : "Short-supplied Item",
      variantName: matched?.sku.variantName || "Standard",
      hsnCode: matched?.sku.product.hsnCode || "19019090",
      gstRatePercent: matched ? Number(matched.sku.product.gstRate) : 5,
      quantity: si.shortQty,
      unitPricePaise: si.unitPricePaise,
      shortSuppliedQty: si.shortQty,
    };
  });

  const creditNoteData = generateTaxInvoiceData(
    creditNoteNumber,
    lineInputs,
    false,
    true,
    origInvoiceNum
  );

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: creditNoteNumber,
      orderId: order.id,
      totalTaxablePaise: creditNoteData.totalTaxablePaise,
      totalCgstPaise: creditNoteData.totalCgstPaise,
      totalSgstPaise: creditNoteData.totalSgstPaise,
      totalIgstPaise: creditNoteData.totalIgstPaise,
      totalAmountPaise: refundAmountPaise,
      invoiceData: creditNoteData as any,
    },
  });

  await recordAuditLog({
    actorId,
    action: "CREDIT_NOTE_ISSUED",
    entity: "Invoice",
    entityId: invoice.id,
    before: null,
    after: {
      creditNoteNumber,
      orderId,
      refundAmountPaise,
      reason,
    },
  });

  return invoice;
}
