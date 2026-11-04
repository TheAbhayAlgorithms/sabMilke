import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";
import { getPaymentAdapter } from "@/server/adapters/payment";
import { OrderStatus, PaymentStatus, WalletTxType, CycleStatus } from "@prisma/client";

export interface CreateOrderItemInput {
  skuId: string;
  quantity: number;
}

export interface CreateOrderInput {
  societyId: string;
  cycleId: string;
  flatId: string;
  items: CreateOrderItemInput[];
  useWalletPaise?: number;
  paymentMethod?: string;
}

export async function createOrder(actorId: string, input: CreateOrderInput) {
  if (!input.items || input.items.length === 0) {
    throw new Error("Order basket cannot be empty.");
  }

  // 1. Validate Cycle is OPEN
  const cycle = await prisma.cycle.findUnique({
    where: { id: input.cycleId },
    include: {
      cycleSkus: {
        include: { sku: true },
      },
    },
  });

  if (!cycle) throw new Error("Cycle not found.");
  if (cycle.status !== CycleStatus.OPEN) {
    throw new Error(`Cannot place order: Cycle is currently ${cycle.status}.`);
  }
  if (cycle.societyId !== input.societyId) {
    throw new Error("Cycle does not belong to the selected society.");
  }

  // 2. Validate Flat belongs to Society and Flat has no active order for this cycle
  const flat = await prisma.flat.findFirst({
    where: { id: input.flatId, societyId: input.societyId },
  });
  if (!flat) throw new Error("Flat not found in this society.");

  const existingOrder = await prisma.order.findUnique({
    where: {
      cycleId_flatId: {
        cycleId: input.cycleId,
        flatId: input.flatId,
      },
    },
  });

  if (
    existingOrder &&
    existingOrder.status !== OrderStatus.CANCELLED &&
    existingOrder.status !== OrderStatus.REFUNDED
  ) {
    throw new Error(
      `An active order (${existingOrder.pickupCode}) already exists for flat ${flat.flatNumber} in this cycle.`
    );
  }

  // 3. Compute Item Totals using CycleSku Guaranteed Prices
  const cycleSkuMap = new Map(cycle.cycleSkus.map((cs) => [cs.skuId, cs]));
  let totalGuaranteedPaise = 0;

  const orderItemsData = input.items.map((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid quantity ${item.quantity} for item.`);
    }

    const cycleSku = cycleSkuMap.get(item.skuId);
    if (!cycleSku) {
      throw new Error(`Item ${item.skuId} is not available in this cycle.`);
    }

    const itemTotal = cycleSku.guaranteedPricePaise * item.quantity;
    totalGuaranteedPaise += itemTotal;

    return {
      skuId: item.skuId,
      quantity: item.quantity,
      guaranteedPricePaise: cycleSku.guaranteedPricePaise,
    };
  });

  // 4. Validate and Deduct Wallet Balance (if requested)
  const requestedWalletPaise = input.useWalletPaise ?? 0;
  if (requestedWalletPaise < 0 || !Number.isInteger(requestedWalletPaise)) {
    throw new Error("Invalid wallet deduction amount.");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actorId },
    include: { wallet: true },
  });

  const walletBalance = user.wallet?.balancePaise ?? 0;
  const walletDeductionPaise = Math.min(requestedWalletPaise, walletBalance, totalGuaranteedPaise);
  const netPayablePaise = totalGuaranteedPaise - walletDeductionPaise;

  // 5. Generate Pickup PIN and QR Code Token
  const pickupCode = Math.floor(100000 + Math.random() * 900000).toString();
  const qrCodeToken = `sb_qr_${input.societyId}_${Date.now()}_${pickupCode}`;

  const isFullWalletPaid = netPayablePaise === 0;

  return prisma.$transaction(async (tx) => {
    // Deduct from wallet if applicable
    if (walletDeductionPaise > 0 && user.wallet) {
      await tx.wallet.update({
        where: { id: user.wallet.id },
        data: { balancePaise: { decrement: walletDeductionPaise } },
      });
    }

    // Create Order
    const order = await tx.order.create({
      data: {
        cycleId: input.cycleId,
        societyId: input.societyId,
        flatId: input.flatId,
        userId: actorId,
        status: isFullWalletPaid ? OrderStatus.CONFIRMED : OrderStatus.PENDING_PAYMENT,
        totalGuaranteedPaise,
        totalFinalPaise: null,
        totalRefundPaise: 0,
        pickupCode,
        qrCodeToken,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: { include: { sku: { include: { product: true } } } },
      },
    });

    // Record wallet transaction if wallet was used
    if (walletDeductionPaise > 0 && user.wallet) {
      await tx.walletTransaction.create({
        data: {
          walletId: user.wallet.id,
          amountPaise: -walletDeductionPaise,
          type: WalletTxType.ORDER_PAYMENT,
          referenceId: order.id,
          description: `Applied wallet balance to Order #${pickupCode}`,
        },
      });
    }

    // Create Payment Record & external payment order
    let paymentOrderResult = null;
    if (netPayablePaise > 0) {
      const paymentAdapter = getPaymentAdapter();
      paymentOrderResult = await paymentAdapter.createOrder({
        orderId: order.id,
        amountPaise: netPayablePaise,
        customerName: user.name,
        customerPhone: user.phone,
        notes: {
          societyId: input.societyId,
          cycleId: input.cycleId,
          flatNumber: flat.flatNumber,
        },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: "MOCK_RAZORPAY",
          providerOrderId: paymentOrderResult.providerOrderId,
          amountPaise: netPayablePaise,
          status: PaymentStatus.INITIATED,
          paymentMethod: input.paymentMethod || "UPI_INTENT",
        },
      });
    } else {
      // Net payable is 0: mark wallet payment as success immediately
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: "WALLET",
          providerPaymentId: `wallet_pay_${order.id}`,
          amountPaise: walletDeductionPaise,
          status: PaymentStatus.SUCCESS,
          paymentMethod: "WALLET",
        },
      });

      // Increment cycleSku pooled quantities immediately
      for (const item of orderItemsData) {
        await tx.cycleSku.updateMany({
          where: { cycleId: input.cycleId, skuId: item.skuId },
          data: { pooledQuantity: { increment: item.quantity } },
        });
      }
    }

    // Record in AuditLog
    await recordAuditLog(
      {
        societyId: input.societyId,
        actorId,
        action: "ORDER_CREATED",
        entity: "Order",
        entityId: order.id,
        after: {
          pickupCode: order.pickupCode,
          status: order.status,
          totalGuaranteedPaise: order.totalGuaranteedPaise,
          netPayablePaise,
          walletDeductionPaise,
          itemsCount: order.items.length,
        },
      },
      tx
    );

    return {
      order,
      netPayablePaise,
      walletDeductionPaise,
      paymentOrder: paymentOrderResult,
    };
  });
}

export interface ConfirmPaymentInput {
  orderId: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  paymentMethod?: string;
  upiVpa?: string;
}

export async function confirmOrderPayment(
  actorId: string | null | undefined,
  input: ConfirmPaymentInput
) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      items: true,
      payments: true,
      cycle: true,
    },
  });

  if (!order) throw new Error(`Order '${input.orderId}' not found.`);

  // IDEMPOTENCY: If order is already confirmed or paid, return without duplicating
  if (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PAID) {
    return { order, alreadyConfirmed: true };
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update Payment status
    const pendingPayment = order.payments.find((p) => p.status === PaymentStatus.INITIATED) || order.payments[0];
    if (pendingPayment) {
      await tx.payment.update({
        where: { id: pendingPayment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          providerPaymentId: input.providerPaymentId || pendingPayment.providerPaymentId || `mock_pay_${Date.now()}`,
          paymentMethod: input.paymentMethod || pendingPayment.paymentMethod,
          upiVpa: input.upiVpa || pendingPayment.upiVpa,
        },
      });
    }

    // 2. Update Order status
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CONFIRMED },
      include: { items: true, payments: true },
    });

    // 3. Increment pooled quantities on CycleSku
    for (const item of order.items) {
      await tx.cycleSku.updateMany({
        where: { cycleId: order.cycleId, skuId: item.skuId },
        data: { pooledQuantity: { increment: item.quantity } },
      });
    }

    // 4. Record state change in AuditLog (Rule 2)
    await recordAuditLog(
      {
        societyId: order.societyId,
        actorId,
        action: "ORDER_PAID",
        entity: "Order",
        entityId: order.id,
        before: { status: order.status },
        after: {
          status: OrderStatus.CONFIRMED,
          providerPaymentId: input.providerPaymentId,
          totalGuaranteedPaise: order.totalGuaranteedPaise,
        },
      },
      tx
    );

    return { order: updatedOrder, alreadyConfirmed: false };
  });
}

export async function getOrdersForUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: {
      cycle: { select: { name: true, status: true, locksAt: true, deliveryTargetDate: true } },
      flat: { select: { flatNumber: true, tower: true } },
      items: {
        include: {
          sku: {
            include: { product: true },
          },
        },
      },
      payments: true,
      refunds: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderDetails(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      cycle: {
        include: {
          society: {
            include: { dropPoints: true },
          },
        },
      },
      flat: true,
      items: {
        include: {
          sku: {
            include: {
              product: { include: { category: true } },
              quotes: {
                where: { isActive: true },
                include: { slabs: { orderBy: { minQty: "asc" } } },
              },
            },
          },
        },
      },
      payments: true,
      refunds: true,
      user: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!order) throw new Error("Order not found.");
  // Access check: resident must own order or be admin/captain
  if (order.userId !== userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    });
    const isStaff = user?.memberships.some(
      (m) =>
        m.societyId === order.societyId &&
        (m.role === "CAPTAIN" || m.role === "PLATFORM_ADMIN" || m.role === "SOCIETY_ADMIN")
    );
    if (!isStaff) {
      throw new Error("You do not have permission to view this order.");
    }
  }

  return order;
}

export async function reorderLastMonth(userId: string, currentCycleId: string) {
  // Find latest past confirmed order
  const lastOrder = await prisma.order.findFirst({
    where: {
      userId,
      status: { in: [OrderStatus.CONFIRMED, OrderStatus.ALLOCATED, OrderStatus.RECEIVED_AT_DROP, OrderStatus.HANDED_OVER] },
    },
    include: {
      items: {
        include: {
          sku: {
            include: { product: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!lastOrder) {
    throw new Error("No previous orders found to reorder from.");
  }

  // Get current prices for these SKUs in the current cycle
  const currentCycleSkus = await prisma.cycleSku.findMany({
    where: {
      cycleId: currentCycleId,
      skuId: { in: lastOrder.items.map((i) => i.skuId) },
    },
    include: {
      sku: { include: { product: true } },
    },
  });

  const priceMap = new Map(currentCycleSkus.map((cs) => [cs.skuId, cs]));

  const reorderItems = lastOrder.items.map((item) => {
    const cs = priceMap.get(item.skuId);
    return {
      skuId: item.skuId,
      quantity: item.quantity,
      productName: `${item.sku.product.brand} - ${item.sku.product.name}`,
      variantName: item.sku.variantName,
      mrpPaise: item.sku.mrpPaise,
      guaranteedPricePaise: cs ? cs.guaranteedPricePaise : item.guaranteedPricePaise,
      isAvailable: !!cs,
    };
  });

  return {
    previousOrderPickupCode: lastOrder.pickupCode,
    items: reorderItems,
  };
}
