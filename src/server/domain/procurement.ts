import { formatINR } from "@/lib/money";

export interface CycleSkuWithWinningQuote {
  skuId: string;
  sku: {
    id: string;
    variantName: string;
    packSize: number;
    unit: string;
    mrpPaise: number;
    product: {
      name: string;
      brand: string;
      isFood: boolean;
      fssaiNumber: string | null;
      category: {
        name: string;
      };
    };
  };
  pooledQuantity: number;
  finalPricePaise: number | null;
  finalSupplierPricePaise: number | null;
  winningSupplierId: string | null;
  winningSupplierQuote?: {
    id: string;
    supplierId: string;
    supplier: {
      id: string;
      name: string;
      rating: number;
    };
    leadTimeDays: number;
    moq: number;
  } | null;
}

export interface ProposedPoItem {
  skuId: string;
  productName: string;
  variantName: string;
  packSize: number;
  unit: string;
  orderedQuantity: number;
  unitPricePaise: number;
  totalPricePaise: number;
}

export interface ProposedPurchaseOrder {
  supplierId: string;
  supplierName: string;
  supplierRating: number;
  leadTimeDays: number;
  expectedDeliveryDays: number;
  items: ProposedPoItem[];
  totalAmountPaise: number;
  totalUnits: number;
}

/**
 * Pure domain function to preview purchase orders for a locked cycle.
 * Groups winning SKUs and pooled quantities by winning supplier.
 */
export function previewPurchaseOrders(
  cycleSkus: CycleSkuWithWinningQuote[]
): ProposedPurchaseOrder[] {
  const supplierMap = new Map<string, ProposedPurchaseOrder>();

  for (const cs of cycleSkus) {
    if (!cs.winningSupplierId || !cs.winningSupplierQuote) continue;
    if (cs.pooledQuantity <= 0) continue;

    const supplierId = cs.winningSupplierId;
    const supplierName = cs.winningSupplierQuote.supplier.name;
    const supplierRating = cs.winningSupplierQuote.supplier.rating;
    const leadTimeDays = cs.winningSupplierQuote.leadTimeDays || 3;
    const unitPricePaise = cs.finalSupplierPricePaise ?? 0;
    const totalPricePaise = unitPricePaise * cs.pooledQuantity;

    let po = supplierMap.get(supplierId);
    if (!po) {
      po = {
        supplierId,
        supplierName,
        supplierRating,
        leadTimeDays,
        expectedDeliveryDays: leadTimeDays,
        items: [],
        totalAmountPaise: 0,
        totalUnits: 0,
      };
      supplierMap.set(supplierId, po);
    }

    po.items.push({
      skuId: cs.skuId,
      productName: `${cs.sku.product.brand} - ${cs.sku.product.name}`,
      variantName: cs.sku.variantName,
      packSize: cs.sku.packSize,
      unit: cs.sku.unit,
      orderedQuantity: cs.pooledQuantity,
      unitPricePaise,
      totalPricePaise,
    });

    po.totalAmountPaise += totalPricePaise;
    po.totalUnits += cs.pooledQuantity;
  }

  return Array.from(supplierMap.values());
}

export interface OrderItemForShortage {
  id: string;
  orderId: string;
  skuId: string;
  quantity: number;
  finalPricePaise: number;
  order: {
    id: string;
    userId: string;
    flat: {
      flatNumber: string;
      tower: string | null;
    };
  };
}

export interface ShortageAdjustmentResult {
  affectedOrderItems: {
    orderItemId: string;
    orderId: string;
    userId: string;
    flatNumber: string;
    skuId: string;
    orderedQty: number;
    shortQty: number;
    deliveredQty: number;
    refundAmountPaise: number;
  }[];
  totalRefundPaise: number;
}

/**
 * Pure domain function to allocate short supply across orders containing the SKU.
 * Allocates shortages in FIFO order among affected orders.
 */
export function calculateShortSupplyAllocations(
  skuId: string,
  totalShortQty: number,
  orderItems: OrderItemForShortage[]
): ShortageAdjustmentResult {
  if (totalShortQty <= 0 || orderItems.length === 0) {
    return { affectedOrderItems: [], totalRefundPaise: 0 };
  }

  const relevantItems = orderItems.filter((i) => i.skuId === skuId);
  let remainingShortage = totalShortQty;
  const affected: ShortageAdjustmentResult["affectedOrderItems"] = [];
  let totalRefund = 0;

  for (const item of relevantItems) {
    if (remainingShortage <= 0) break;

    const shortForThisItem = Math.min(item.quantity, remainingShortage);
    const deliveredQty = item.quantity - shortForThisItem;
    const refundAmountPaise = shortForThisItem * item.finalPricePaise;

    affected.push({
      orderItemId: item.id,
      orderId: item.orderId,
      userId: item.order.userId,
      flatNumber: item.order.flat.tower
        ? `${item.order.flat.tower} - ${item.order.flat.flatNumber}`
        : item.order.flat.flatNumber,
      skuId: item.skuId,
      orderedQty: item.quantity,
      shortQty: shortForThisItem,
      deliveredQty,
      refundAmountPaise,
    });

    remainingShortage -= shortForThisItem;
    totalRefund += refundAmountPaise;
  }

  return {
    affectedOrderItems: affected,
    totalRefundPaise: totalRefund,
  };
}
