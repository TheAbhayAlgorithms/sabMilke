import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { requireAuth } from "@/server/auth/guards";
import { generateResidentInvoice } from "@/server/services/invoiceService";
import { prisma } from "@/server/db/client";
import { Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const isPlatformAdmin =
      user.activeRole === Role.PLATFORM_ADMIN ||
      user.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    const isSocietyCaptain = user.memberships.some(
      (m) =>
        m.societyId === order.societyId &&
        (m.role === Role.CAPTAIN || m.role === Role.PLATFORM_ADMIN)
    );

    const isOrderOwner = order.userId === user.userId;

    if (!isPlatformAdmin && !isSocietyCaptain && !isOrderOwner) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to view this invoice." },
        { status: 403 }
      );
    }

    const invoiceData = await generateResidentInvoice(order.id);

    return NextResponse.json({
      order: {
        id: order.id,
        pickupCode: order.pickupCode,
        status: order.status,
        createdAt: order.createdAt,
        societyName: order.society.name,
        flatNumber: order.flat.flatNumber,
        tower: order.flat.tower,
        residentName: order.user.name || "Resident",
        residentPhone: order.user.phone,
      },
      invoice: invoiceData,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load tax invoice" },
      { status: 400 }
    );
  }
}

