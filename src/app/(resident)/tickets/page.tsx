import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { listTickets } from "@/server/services/ticketService";
import { ResidentTicketsListClient } from "@/components/resident/ResidentTicketsListClient";

export const dynamic = "force-dynamic";

export default async function ResidentTicketsPage() {
  const session = await getCurrentSession();
  if (!session?.userId) {
    redirect("/login?next=/tickets");
  }

  const rawTickets = await listTickets({ userId: session.userId });

  const tickets = rawTickets.map((t) => ({
    id: t.id,
    category: t.category,
    subject: t.subject,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    order: {
      id: t.order.id,
      pickupCode: t.order.pickupCode,
    },
    sla: {
      isAcknowledged: t.sla.isAcknowledged,
      acknowledgementRemainingHours: t.sla.acknowledgementRemainingHours,
      isAcknowledgementBreached: t.sla.isAcknowledgementBreached,
      isResolved: t.sla.isResolved,
    },
  }));

  return <ResidentTicketsListClient tickets={tickets} />;
}
