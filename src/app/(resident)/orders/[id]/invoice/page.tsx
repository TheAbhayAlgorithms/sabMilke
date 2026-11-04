import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { prisma } from "@/server/db/client";
import { generateResidentInvoice } from "@/server/services/invoiceService";
import { ResidentInvoiceClient } from "@/components/resident/ResidentInvoiceClient";
import { Role } from "@prisma/client";
import Link from "next/link";

interface ResidentInvoicePageProps {
  params: { id: string };
}

export default async function ResidentInvoicePage({ params }: ResidentInvoicePageProps) {
  const session = await getCurrentSession();
  const user = requireAuth(session);

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      society: true,
      flat: true,
      cycle: true,
      invoices: true,
    },
  });

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-xs text-gray-500">
        Order not found.
      </div>
    );
  }

  const isPlatformAdmin =
    user.activeRole === Role.PLATFORM_ADMIN ||
    user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

  const isSocietyCaptain = user.memberships.some(
    (m) =>
      m.societyId === order.societyId &&
      (m.role === Role.CAPTAIN || m.role === Role.PLATFORM_ADMIN)
  );

  const isOwner = order.userId === user.userId;

  if (!isPlatformAdmin && !isSocietyCaptain && !isOwner) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-xs text-red-500">
        You are not authorized to view this invoice.
      </div>
    );
  }

  const invoiceData = await generateResidentInvoice(order.id);

  const orderSummary = {
    id: order.id,
    pickupCode: order.pickupCode,
    status: order.status,
    createdAt: order.createdAt,
    societyName: order.society.name,
    flatNumber: order.flat.flatNumber,
    tower: order.flat.tower,
    residentName: order.user.name || "Resident",
    residentPhone: order.user.phone,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ResidentInvoiceClient order={orderSummary} invoice={invoiceData} />
    </div>
  );
}
