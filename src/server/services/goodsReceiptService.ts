import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";
import { createCreditNote } from "@/server/services/invoiceService";
import { calculateShortSupplyAllocations } from "@/server/domain/procurement";
import {
  PurchaseOrderStatus,
  CycleStatus,
  OrderStatus,
  WalletTxType,
} from "@prisma/client";

export interface ReceivedItemInput {
  skuId: string;
  receivedQty: number;
  discrepancyNote?: string;
}

export interface RecordGoodsReceiptInput {
  actorId: string;
  purchaseOrderId: string;
  receivedItems: ReceivedItemInput[];
  notes?: string;
}

export async function recordGoodsReceipt(input: RecordGoodsReceiptInput) {
  const { actorId, purchaseOrderId, receivedItems, notes } = input;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      cycle: {
        include: {
          society: true,
          orders: {
            where: {
              status: {
                in: [
                  OrderStatus.PAID,
                  OrderStatus.CONFIRMED,
                  OrderStatus.ALLOCATED,
                ],
              },
            },
            include: {
              flat: true,
              items: {
                include: { sku: true },
              },
            },
          },
        },
      },
      items: {
        include: { sku: true },
      },
    },
  });

  if (!po) throw new Error("Purchase order not found.");
  if (
    po.status !== PurchaseOrderStatus.DISPATCHED &&
    po.status !== PurchaseOrderStatus.CONFIRMED
  ) {
    throw new Error(`Cannot record goods receipt for PO in ${po.status} status.`);
  }

  return prisma.$transaction(async (tx) => {
    // 1. Build receipt items and detect shortages
    let hasShortage = false;
    const receiptItemsData = [];
    const shortagesBySku = new Map<string, number>();

    for (const poItem of po.items) {
      const received = receivedItems.find((r) => r.skuId === poItem.skuId);
      const receivedQty = received ? Math.max(0, received.receivedQty) : poItem.orderedQuantity;
      const shortQty = Math.max(0, poItem.orderedQuantity - receivedQty);

      if (shortQty > 0) {
        hasShortage = true;
        shortagesBySku.set(poItem.skuId, shortQty);
      }

      receiptItemsData.push({
        skuId: poItem.skuId,
        expectedQty: poItem.orderedQuantity,
        receivedQty,
        shortQty,
        discrepancyNote: received?.discrepancyNote || (shortQty > 0 ? `Short-supplied by ${shortQty} units` : null),
      });
    }

    // 2. Create GoodsReceipt
    const goodsReceipt = await tx.goodsReceipt.create({
      data: {
        purchaseOrderId: po.id,
        receivedBy: actorId,
        notes: notes || "Delivered to society drop point",
        items: {
          create: receiptItemsData,
        },
      },
      include: { items: true },
    });

    const affectedOrderIds = new Set<string>();

    // 3. Process Shortages if any
    if (hasShortage) {
      for (const [skuId, shortQty] of shortagesBySku.entries()) {
        // Collect candidate order items for this SKU across the cycle
        const candidateItems = [];
        for (const order of po.cycle.orders) {
          const matchedItem = order.items.find((i) => i.skuId === skuId);
          if (matchedItem) {
            candidateItems.push({
              id: matchedItem.id,
              orderId: order.id,
              skuId: matchedItem.skuId,
              quantity: matchedItem.quantity,
              finalPricePaise: matchedItem.finalPricePaise ?? matchedItem.guaranteedPricePaise,
              order: {
                id: order.id,
                userId: order.userId,
                flat: {
                  flatNumber: order.flat.flatNumber,
                  tower: order.flat.tower,
                },
              },
            });
          }
        }

        const allocation = calculateShortSupplyAllocations(skuId, shortQty, candidateItems);

        for (const aff of allocation.affectedOrderItems) {
          affectedOrderIds.add(aff.orderId);

          // Update OrderItem shortSuppliedQty
          await tx.orderItem.update({
            where: { id: aff.orderItemId },
            data: {
              shortSuppliedQty: { increment: aff.shortQty },
              refundDeltaPaise: { increment: aff.refundAmountPaise },
            },
          });

          // Update Order totalRefundPaise & status
          await tx.order.update({
            where: { id: aff.orderId },
            data: {
              totalRefundPaise: { increment: aff.refundAmountPaise },
              status: OrderStatus.SHORT_SUPPLIED,
            },
          });

          // Auto-credit resident wallet (Rule 3.3)
          const userWallet = await tx.wallet.findUnique({
            where: { userId: aff.userId },
          });

          if (userWallet) {
            await tx.wallet.update({
              where: { id: userWallet.id },
              data: { balancePaise: { increment: aff.refundAmountPaise } },
            });

            await tx.walletTransaction.create({
              data: {
                walletId: userWallet.id,
                amountPaise: aff.refundAmountPaise,
                type: WalletTxType.SHORT_SUPPLY_REFUND,
                description: `Short-supply refund for ${aff.shortQty}x SKU ${aff.skuId} in cycle ${po.cycle.name}`,
                referenceId: aff.orderId,
              },
            });
          }

          // Record Refund record
          await tx.refund.create({
            data: {
              orderId: aff.orderId,
              amountPaise: aff.refundAmountPaise,
              reason: WalletTxType.SHORT_SUPPLY_REFUND,
              status: "SUCCESS",
            },
          });
        }
      }

      // Update PO status to DISCREPANCY
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: PurchaseOrderStatus.DISCREPANCY },
      });

      // Update cycle status to PARTIAL per Rule 3.1
      await tx.cycle.update({
        where: { id: po.cycleId },
        data: { status: CycleStatus.PARTIAL },
      });

      // Mark unaffected orders as RECEIVED_AT_DROP
      for (const order of po.cycle.orders) {
        if (!affectedOrderIds.has(order.id)) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.RECEIVED_AT_DROP },
          });
        }
      }
    } else {
      // Clean full delivery
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: PurchaseOrderStatus.DELIVERED },
      });

      // Transition cycle to DISTRIBUTING
      await tx.cycle.update({
        where: { id: po.cycleId },
        data: { status: CycleStatus.DISTRIBUTING },
      });

      // Update all orders to RECEIVED_AT_DROP
      await tx.order.updateMany({
        where: {
          cycleId: po.cycleId,
          status: { in: [OrderStatus.PAID, OrderStatus.CONFIRMED, OrderStatus.ALLOCATED] },
        },
        data: { status: OrderStatus.RECEIVED_AT_DROP },
      });
    }

    // Record audit log
    await recordAuditLog({
      actorId,
      action: hasShortage ? "GOODS_RECEIPT_SHORTAGE" : "GOODS_RECEIPT_VERIFIED",
      entity: "GoodsReceipt",
      entityId: goodsReceipt.id,
      before: { poStatus: po.status },
      after: {
        purchaseOrderId: po.id,
        hasShortage,
        shortItemsCount: shortagesBySku.size,
        receiptId: goodsReceipt.id,
      },
    });

    return {
      success: true,
      hasShortage,
      goodsReceipt,
    };
  });
}

