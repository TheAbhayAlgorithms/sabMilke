import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { getTicket } from "@/server/services/ticketService";
import { AdminTicketDetailClient } from "@/components/admin/AdminTicketDetailClient";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

interface AdminTicketDetailPageProps {
  params: { id: string };
}

export default async function AdminTicketDetailPage({ params }: AdminTicketDetailPageProps) {
  const session = await getCurrentSession();
  if (!session?.userId) {
    redirect(`/login?next=/admin/tickets/${params.id}`);
  }

  const isPlatformAdmin =
    session.activeRole === Role.PLATFORM_ADMIN ||
    session.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

  if (!isPlatformAdmin) {
    redirect("/");
  }

  try {
    const rawTicket = await getTicket(params.id, session.userId, true);

    const ticket = {
      id: rawTicket.id,
      category: rawTicket.category,
      subject: rawTicket.subject,
      description: rawTicket.description,
      photoUrls: rawTicket.photoUrls,
      status: rawTicket.status,
      createdAt: rawTicket.createdAt.toISOString(),
      acknowledgedAt: rawTicket.acknowledgedAt?.toISOString() || null,
      resolvedAt: rawTicket.resolvedAt?.toISOString() || null,
      resolutionNotes: rawTicket.resolutionNotes,
      sla: {
        isAcknowledged: rawTicket.sla.isAcknowledged,
        acknowledgementRemainingHours: rawTicket.sla.acknowledgementRemainingHours,
        isAcknowledgementBreached: rawTicket.sla.isAcknowledgementBreached,
        resolutionRemainingDays: rawTicket.sla.resolutionRemainingDays,
        isResolutionBreached: rawTicket.sla.isResolutionBreached,
        isResolved: rawTicket.sla.isResolved,
      },
      user: {
        id: rawTicket.user.id,
        name: rawTicket.user.name,
        phone: rawTicket.user.phone,
      },
      order: {
        id: rawTicket.order.id,
        pickupCode: rawTicket.order.pickupCode,
        status: rawTicket.order.status,
        totalGuaranteedPaise: rawTicket.order.totalGuaranteedPaise,
        society: rawTicket.order.society ? { name: rawTicket.order.society.name } : undefined,
        items: rawTicket.order.items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          sku: {
            id: i.sku.id,
            name: i.sku.product.name,
            variantName: i.sku.variantName,
            mrpPaise: i.sku.mrpPaise,
          },
        })),
      },
      messages: rawTicket.messages.map((m) => ({
        id: m.id,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
        sender: {
          id: m.sender.id,
          name: m.sender.name || "User",
          role: m.sender.role,
        },
      })),
    };

    return <AdminTicketDetailClient ticket={ticket} />;
  } catch (err) {
    notFound();
  }
}
