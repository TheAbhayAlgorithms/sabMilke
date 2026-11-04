import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";
import { OrderStatus } from "@prisma/client";

export interface FlatPackingListItem {
  skuId: string;
  brand: string;
  productName: string;
  variantName: string;
  unit: string;
  orderedQty: number;
  shortQty: number;
  netQty: number;
  finalPricePaise: number;
}

export interface FlatPackingListGroup {
  orderId: string;
  flatId: string;
  flatNumber: string;
  tower: string | null;
  residentName: string;
  residentPhone: string;
  pickupCode: string;
  qrCodeToken: string;
  orderStatus: OrderStatus;
  totalRefundPaise: number;
  items: FlatPackingListItem[];
  totalUnits: number;
}

export interface PerFlatPackingListResult {
  society: {
    id: string;
    name: string;
    joinCode: string;
    dropPoint: {
      name: string;
      description: string | null;
      instructions: string | null;
    } | null;
  };
  cycle: {
    id: string;
    name: string;
    status: string;
  };
  flats: FlatPackingListGroup[];
  totalOrders: number;
  totalUnitsDistributed: number;
}

export async function getPerFlatPackingList(
  cycleId: string,
  societyId: string
): Promise<PerFlatPackingListResult> {
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, societyId },
    include: {
      society: {
        include: { dropPoints: true },
      },
      orders: {
        where: {
          status: {
            in: [
              OrderStatus.PAID,
              OrderStatus.CONFIRMED,
              OrderStatus.ALLOCATED,
              OrderStatus.RECEIVED_AT_DROP,
              OrderStatus.SHORT_SUPPLIED,
              OrderStatus.HANDED_OVER,
            ],
          },
        },
        include: {
          user: true,
          flat: true,
          items: {
            include: {
              sku: {
                include: { product: true },
              },
            },
          },
        },
        orderBy: [
          { flat: { tower: "asc" } },
          { flat: { flatNumber: "asc" } },
        ],
      },
    },
  });

  if (!cycle) {
    throw new Error("Cycle not found or access denied for this society.");
  }

  let totalUnitsDistributed = 0;

  const flatGroups: FlatPackingListGroup[] = cycle.orders.map((order) => {
    const flatItems: FlatPackingListItem[] = order.items.map((item) => {
      const netQty = Math.max(0, item.quantity - item.shortSuppliedQty);
      totalUnitsDistributed += netQty;

      return {
        skuId: item.skuId,
        brand: item.sku.product.brand,
        productName: item.sku.product.name,
        variantName: item.sku.variantName,
        unit: item.sku.unit,
        orderedQty: item.quantity,
        shortQty: item.shortSuppliedQty,
        netQty,
        finalPricePaise: item.finalPricePaise ?? item.guaranteedPricePaise,
      };
    });

    const totalUnits = flatItems.reduce((sum, i) => sum + i.netQty, 0);

    return {
      orderId: order.id,
      flatId: order.flatId,
      flatNumber: order.flat.flatNumber,
      tower: order.flat.tower,
      residentName: order.user.name,
      residentPhone: order.user.phone,
      pickupCode: order.pickupCode,
      qrCodeToken: order.qrCodeToken,
      orderStatus: order.status,
      totalRefundPaise: order.totalRefundPaise,
      items: flatItems,
      totalUnits,
    };
  });

  const dropPoint = cycle.society.dropPoints[0] || null;

  return {
    society: {
      id: cycle.society.id,
      name: cycle.society.name,
      joinCode: cycle.society.joinCode,
      dropPoint: dropPoint
        ? {
            name: dropPoint.name,
            description: dropPoint.description,
            instructions: dropPoint.instructions,
          }
        : null,
    },
    cycle: {
      id: cycle.id,
      name: cycle.name,
      status: cycle.status,
    },
    flats: flatGroups,
    totalOrders: flatGroups.length,
    totalUnitsDistributed,
  };
}

export async function getHandoverOrderByPinOrQr(query: {
  code: string;
  societyId: string;
}) {
  const cleanCode = query.code.trim().toUpperCase();

  const order = await prisma.order.findFirst({
    where: {
      societyId: query.societyId,
      OR: [
        { pickupCode: cleanCode },
        { qrCodeToken: cleanCode },
      ],
    },
    include: {
      user: true,
      flat: true,
      cycle: true,
      items: {
        include: {
          sku: {
            include: { product: true },
          },
        },
      },
      handoverEvents: {
        include: {
          handedOverBy: true,
        },
        orderBy: { collectedAt: "desc" },
      },
    },
  });

  if (!order) {
    throw new Error(`No order found matching code or token '${cleanCode}' in this society.`);
  }

  return order;
}

export interface RecordHandoverInput {
  actorId: string;
  orderId: string;
  isPartial: boolean;
  collectedItems?: { skuId: string; quantity: number }[];
  notes?: string;
}

export async function recordOrderHandover(input: RecordHandoverInput) {
  const { actorId, orderId, isPartial, collectedItems } = input;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) throw new Error("Order not found.");

  return prisma.$transaction(async (tx) => {
    // 1. Create HandoverEvent
    const handoverEvent = await tx.handoverEvent.create({
      data: {
        orderId: order.id,
        handedOverById: actorId,
        isPartial,
        collectedItems: collectedItems ? (collectedItems as any) : undefined,
      },
    });

    // 2. Update Order status
    const newStatus = isPartial ? order.status : OrderStatus.HANDED_OVER;
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
      },
    });

    // 3. Record audit log (Rule 2)
    await recordAuditLog({
      actorId,
      action: isPartial ? "ORDER_PARTIAL_HANDOVER" : "ORDER_HANDED_OVER",
      entity: "Order",
      entityId: order.id,
      before: { status: order.status },
      after: {
        status: updatedOrder.status,
        handoverEventId: handoverEvent.id,
        isPartial,
      },
    });

    return {
      success: true,
      order: updatedOrder,
      handoverEvent,
    };
  });
}

