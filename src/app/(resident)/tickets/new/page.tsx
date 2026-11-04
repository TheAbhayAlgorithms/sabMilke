import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { RaiseTicketClient } from "@/components/resident/RaiseTicketClient";

export const dynamic = "force-dynamic";

interface NewTicketPageProps {
  searchParams: { orderId?: string };
}

export default async function NewTicketPage({ searchParams }: NewTicketPageProps) {
  const session = await getCurrentSession();
  if (!session?.userId) {
    redirect("/login?next=/tickets/new");
  }

  const { orderId } = searchParams;
  if (!orderId) {
    // If no orderId, redirect to orders list to pick an order
    redirect("/orders");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, pickupCode: true, userId: true },
  });

  if (!order || order.userId !== session.userId) {
    redirect("/orders");
  }

  return <RaiseTicketClient orderId={order.id} orderNumber={order.pickupCode} />;
}
