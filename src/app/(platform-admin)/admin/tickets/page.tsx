import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { listTickets } from "@/server/services/ticketService";
import { AdminTicketListClient } from "@/components/admin/AdminTicketListClient";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  const session = await getCurrentSession();
  if (!session?.userId) {
    redirect("/login?next=/admin/tickets");
  }

  const isPlatformAdmin =
    session.activeRole === Role.PLATFORM_ADMIN ||
    session.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

  if (!isPlatformAdmin) {
    redirect("/");
  }

  const rawTickets = await listTickets();

  const tickets = rawTickets.map((t) => ({
    id: t.id,
    category: t.category,
    subject: t.subject,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    user: {
      name: t.user.name,
      phone: t.user.phone,
    },
    order: {
      id: t.order.id,
      pickupCode: t.order.pickupCode,
      society: t.order.society ? { name: t.order.society.name } : undefined,
    },
    sla: {
      isAcknowledged: t.sla.isAcknowledged,
      acknowledgementRemainingHours: t.sla.acknowledgementRemainingHours,
      isAcknowledgementBreached: t.sla.isAcknowledgementBreached,
      resolutionRemainingDays: t.sla.resolutionRemainingDays,
      isResolutionBreached: t.sla.isResolutionBreached,
      isResolved: t.sla.isResolved,
    },
  }));

  return <AdminTicketListClient initialTickets={tickets} />;
}
