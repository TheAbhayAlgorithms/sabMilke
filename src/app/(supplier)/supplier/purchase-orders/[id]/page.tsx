import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireSupplier } from "@/server/auth/guards";
import { getPurchaseOrderDetail } from "@/server/services/purchaseOrderService";
import { SupplierPoDetailClient } from "@/components/supplier/SupplierPoDetailClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface SupplierPoPageProps {
  params: { id: string };
}

export default async function SupplierPoDetailPage({ params }: SupplierPoPageProps) {
  const session = await getCurrentSession();
  const user = requireSupplier(session);
  const supplierId = user.supplierId || session?.supplierId;

  if (!supplierId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-gray-500">
        Supplier account not linked.
      </div>
    );
  }

  const po = await getPurchaseOrderDetail(params.id, supplierId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Navigation */}
      <div className="mb-4">
        <Link
          href="/supplier/purchase-orders"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Purchase Orders
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Purchase Order #{po.poNumber}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Assigned to {po.supplier.name} • Society: {po.cycle.society.name}
        </p>
      </div>

      <SupplierPoDetailClient initialPo={po as any} />
    </div>
  );
}
