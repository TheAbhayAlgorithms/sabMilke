import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { getTicket } from "@/server/services/ticketService";
import { TicketDetailClient } from "@/components/resident/TicketDetailClient";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

interface TicketPageProps {
  params: { id: string };
}

export default async function TicketPage({ params }: TicketPageProps) {
  const session = await getCurrentSession();
  if (!session?.userId) {
    redirect(`/login?next=/tickets/${params.id}`);
  }

  try {
    const isPlatformAdmin =
      session.activeRole === Role.PLATFORM_ADMIN ||
      session.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

    const rawTicket = await getTicket(params.id, session.userId, isPlatformAdmin);

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

    return <TicketDetailClient ticket={ticket} currentUserId={session.userId} />;
  } catch (err) {
    notFound();
  }
}
