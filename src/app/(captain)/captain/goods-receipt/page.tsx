import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";
import { Role, PurchaseOrderStatus } from "@prisma/client";
import { GoodsReceiptClient } from "@/components/captain/GoodsReceiptClient";
import Link from "next/link";
import { ArrowLeft, Truck } from "lucide-react";

export default async function CaptainGoodsReceiptPage() {
  const session = await getCurrentSession();
  requireRole(session, [Role.CAPTAIN, Role.PLATFORM_ADMIN]);

  // Find society for this captain
  const membership = session?.memberships.find(
    (m) => m.role === Role.CAPTAIN || m.role === Role.PLATFORM_ADMIN
  );
  const societyId = membership?.societyId;

  const whereClause: any = {
    status: {
      in: [
        PurchaseOrderStatus.DISPATCHED,
        PurchaseOrderStatus.CONFIRMED,
        PurchaseOrderStatus.ISSUED,
      ],
    },
  };

  if (societyId && session?.activeRole !== Role.PLATFORM_ADMIN) {
    whereClause.cycle = { societyId };
  }

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: whereClause,
    include: {
      supplier: true,
      cycle: {
        include: { society: true },
      },
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Navigation */}
      <div className="mb-4">
        <Link
          href="/captain"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Captain Hub
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-900 p-6 text-white shadow-sm mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-semibold text-emerald-200 mb-2">
          <Truck className="h-3.5 w-3.5" />
          Society Drop Point Receipt
        </div>
        <h1 className="text-xl sm:text-2xl font-bold">Record Goods Receipt</h1>
        <p className="text-xs text-emerald-200 mt-1">
          When wholesale deliveries arrive at your society drop point, inspect quantities and confirm receipt.
          Any shortages will automatically be refunded to resident wallets.
        </p>
      </div>

      <GoodsReceiptClient availablePos={purchaseOrders as any} />
    </div>
  );
}
