import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { getOrderDetails } from "@/server/services/orderService";
import { notFound, redirect } from "next/navigation";
import { OrderDetailClient } from "@/components/resident/OrderDetailClient";

interface OrderDetailPageProps {
  params: { id: string };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?callbackUrl=/orders/${params.id}`);
  }

  try {
    const rawOrder = await getOrderDetails(session.userId, params.id);

    const order = {
      id: rawOrder.id,
      pickupCode: rawOrder.pickupCode,
      qrCodeToken: rawOrder.qrCodeToken,
      status: rawOrder.status,
      totalGuaranteedPaise: rawOrder.totalGuaranteedPaise,
      totalFinalPaise: rawOrder.totalFinalPaise,
      totalRefundPaise: rawOrder.totalRefundPaise,
      createdAt: rawOrder.createdAt.toISOString(),
      cycle: {
        name: rawOrder.cycle.name,
        status: rawOrder.cycle.status,
        locksAt: rawOrder.cycle.locksAt.toISOString(),
        deliveryTargetDate: rawOrder.cycle.deliveryTargetDate.toISOString(),
        society: {
          name: rawOrder.cycle.society.name,
          dropPoints: rawOrder.cycle.society.dropPoints.map((dp) => ({
            name: dp.name,
            instructions: dp.instructions,
          })),
        },
      },
      flat: {
        flatNumber: rawOrder.flat.flatNumber,
        tower: rawOrder.flat.tower,
      },
      items: rawOrder.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        guaranteedPricePaise: i.guaranteedPricePaise,
        finalPricePaise: i.finalPricePaise,
        refundDeltaPaise: i.refundDeltaPaise,
        sku: {
          variantName: i.sku.variantName,
          product: {
            brand: i.sku.product.brand,
            name: i.sku.product.name,
          },
        },
      })),
      payments: rawOrder.payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        amountPaise: p.amountPaise,
        status: p.status,
        paymentMethod: p.paymentMethod,
      })),
    };

    return <OrderDetailClient order={order} />;
  } catch (err: unknown) {
    notFound();
  }
}

