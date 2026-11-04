import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";
import { notificationService } from "@/server/services/notificationService";
import { createCreditNote } from "@/server/services/invoiceService";
import { computeTicketSla, isOrderEligibleForTicket } from "@/server/domain/tickets";
import { TicketStatus, WalletTxType } from "@prisma/client";

export interface CreateTicketInput {
  userId: string;
  orderId: string;
  category: "MISSING_ITEM" | "DAMAGED_PACK" | "QUALITY_ISSUE" | "OTHER";
  subject: string;
  description: string;
  photoUrls?: string[];
}

export async function createTicket(input: CreateTicketInput) {
  const { userId, orderId, category, subject, description, photoUrls = [] } = input;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      handoverEvents: { orderBy: { collectedAt: "desc" } },
    },
  });

  if (!order) throw new Error("Order not found.");
  if (order.userId !== userId) {
    throw new Error("You can only raise issues for your own orders.");
  }

  // Check 24-hour reporting window
  const latestHandover = order.handoverEvents[0]?.collectedAt;
  const eligibility = isOrderEligibleForTicket(order.status, latestHandover);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason || "Order is not eligible for issue reporting.");
  }

  const resolutionTarget = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day target

  const ticket = await prisma.ticket.create({
    data: {
      orderId: order.id,
      userId,
      category,
      subject: subject.trim(),
      description: description.trim(),
      photoUrls,
      status: TicketStatus.OPEN,
      resolutionTarget,
    },
  });

  // Audit log (Rule 2)
  await recordAuditLog({
    actorId: userId,
    action: "TICKET_CREATED",
    entity: "Ticket",
    entityId: ticket.id,
    after: {
      orderId: order.id,
      category,
      subject,
      status: TicketStatus.OPEN,
    },
  });

  // Notify resident
  await notificationService.notifyTicketUpdate({
    userId,
    phone: order.user.phone,
    ticketId: ticket.id,
    status: "OPEN",
    updateMessage: `Your issue '${subject}' has been submitted (Ticket #${ticket.id.slice(-6).toUpperCase()}). Our grievance officer will review and acknowledge within 48 hours.`,
  });

  return ticket;
}

export async function acknowledgeTicket(actorId: string, ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { user: true, order: true },
  });

  if (!ticket) throw new Error("Ticket not found.");
  if (ticket.status !== TicketStatus.OPEN) {
    throw new Error(`Ticket is already ${ticket.status}.`);
  }

  const acknowledgedAt = new Date();

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: TicketStatus.ACKNOWLEDGED,
      acknowledgedAt,
    },
  });

  await recordAuditLog({
    actorId,
    action: "TICKET_ACKNOWLEDGED",
    entity: "Ticket",
    entityId: ticket.id,
    before: { status: ticket.status },
    after: { status: updatedTicket.status, acknowledgedAt },
  });

  await notificationService.notifyTicketUpdate({
    userId: ticket.userId,
    phone: ticket.user.phone,
    ticketId: ticket.id,
    status: "ACKNOWLEDGED",
    updateMessage: `Ticket #${ticket.id.slice(-6).toUpperCase()} has been formally acknowledged by the SocietyBuy Grievance Officer within our 48-hour SLA. Investigation underway.`,
  });

  return updatedTicket;
}

export async function addTicketMessage(actorId: string, ticketId: string, message: string) {
  if (!message.trim()) throw new Error("Message cannot be empty.");

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { user: true },
  });

  if (!ticket) throw new Error("Ticket not found.");

  const msg = await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderId: actorId,
      message: message.trim(),
    },
    include: { sender: true },
  });

  await recordAuditLog({
    actorId,
    action: "TICKET_MESSAGE_ADDED",
    entity: "Ticket",
    entityId: ticket.id,
    after: { messageId: msg.id, senderId: actorId },
  });

  return msg;
}

export interface ResolveTicketInput {
  actorId: string;
  ticketId: string;
  resolutionNotes: string;
  refundAmountPaise?: number;
  refundReason?: string;
  shortItems?: { skuId: string; shortQty: number; unitPricePaise: number }[];
}

export async function resolveTicket(input: ResolveTicketInput) {
  const {
    actorId,
    ticketId,
    resolutionNotes,
    refundAmountPaise = 0,
    refundReason,
    shortItems = [],
  } = input;

  if (refundAmountPaise < 0 || !Number.isInteger(refundAmountPaise)) {
    throw new Error("Refund amount must be a positive integer number of paise.");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      user: { include: { wallet: true } },
      order: { include: { items: true } },
    },
  });

  if (!ticket) throw new Error("Ticket not found.");
  if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.REJECTED) {
    throw new Error(`Ticket is already ${ticket.status}.`);
  }

  return prisma.$transaction(async (tx) => {
    let refundRecord = null;

    // Process refund if amount > 0
    if (refundAmountPaise > 0) {
      // 1. Create Refund record
      refundRecord = await tx.refund.create({
        data: {
          orderId: ticket.orderId,
          amountPaise: refundAmountPaise,
          reason: WalletTxType.TICKET_REFUND,
          status: "SUCCESS",
        },
      });

      // 2. Credit to resident's wallet
      const currentBalance = ticket.user.wallet?.balancePaise || 0;
      const newBalance = currentBalance + refundAmountPaise;

      await tx.wallet.upsert({
        where: { userId: ticket.userId },
        update: { balancePaise: newBalance },
        create: { userId: ticket.userId, balancePaise: refundAmountPaise },
      });

      // 3. Record wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: ticket.user.wallet?.id || (await tx.wallet.findUnique({ where: { userId: ticket.userId } }))!.id,
          type: WalletTxType.TICKET_REFUND,
          amountPaise: refundAmountPaise,
          referenceId: ticket.id,
          description: `Grievance Resolution: ${resolutionNotes}`,
        },
      });

      // 4. Update order totalRefundPaise
      await tx.order.update({
        where: { id: ticket.orderId },
        data: {
          totalRefundPaise: { increment: refundAmountPaise },
        },
      });
    }

    // 5. Update Ticket to RESOLVED
    const resolvedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionNotes,
      },
    });

    // 6. Audit log (Rule 2)
    await recordAuditLog({
      actorId,
      action: "TICKET_RESOLVED",
      entity: "Ticket",
      entityId: ticket.id,
      before: { status: ticket.status },
      after: {
        status: TicketStatus.RESOLVED,
        resolutionNotes,
        refundAmountPaise,
        refundId: refundRecord?.id,
      },
    });

    // Generate credit note if refund was given
    if (refundAmountPaise > 0 && shortItems.length > 0) {
      try {
        await createCreditNote(
          actorId,
          ticket.orderId,
          refundAmountPaise,
          `Ticket Refund: ${ticket.subject}`,
          shortItems
        );
      } catch (err) {
        console.warn("Credit note generation warning during ticket resolution:", err);
      }
    }

    // Notify resident
    await notificationService.notifyTicketUpdate({
      userId: ticket.userId,
      phone: ticket.user.phone,
      ticketId: ticket.id,
      status: "RESOLVED",
      updateMessage: refundAmountPaise > 0
        ? `Ticket #${ticket.id.slice(-6).toUpperCase()} resolved! A refund of ₹${(refundAmountPaise / 100).toFixed(0)} has been credited to your SocietyBuy wallet. Notes: ${resolutionNotes}`
        : `Ticket #${ticket.id.slice(-6).toUpperCase()} has been resolved: ${resolutionNotes}`,
    });

    return resolvedTicket;
  });
}

export async function rejectTicket(actorId: string, ticketId: string, reason: string) {
  if (!reason.trim()) throw new Error("Rejection reason is required.");

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { user: true },
  });

  if (!ticket) throw new Error("Ticket not found.");

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: TicketStatus.REJECTED,
      resolvedAt: new Date(),
      resolutionNotes: reason.trim(),
    },
  });

  await recordAuditLog({
    actorId,
    action: "TICKET_REJECTED",
    entity: "Ticket",
    entityId: ticket.id,
    before: { status: ticket.status },
    after: { status: TicketStatus.REJECTED, resolutionNotes: reason.trim() },
  });

  await notificationService.notifyTicketUpdate({
    userId: ticket.userId,
    phone: ticket.user.phone,
    ticketId: ticket.id,
    status: "REJECTED",
    updateMessage: `Ticket #${ticket.id.slice(-6).toUpperCase()} was rejected: ${reason.trim()}`,
  });

  return updated;
}

export async function listTickets(filters: {
  userId?: string;
  status?: TicketStatus;
  orderId?: string;
} = {}) {
  const where: any = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.status) where.status = filters.status;
  if (filters.orderId) where.orderId = filters.orderId;

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, phone: true } },
      order: {
        select: {
          id: true,
          pickupCode: true,
          status: true,
          totalGuaranteedPaise: true,
          totalFinalPaise: true,
          society: { select: { id: true, name: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  return tickets.map((t) => {
    const sla = computeTicketSla(t.createdAt, t.acknowledgedAt, t.resolvedAt, now);
    return {
      ...t,
      sla,
    };
  });
}

export async function getTicket(ticketId: string, requestingUserId?: string, isAdmin = false) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      order: {
        include: {
          society: { select: { id: true, name: true } },
          items: {
            include: {
              sku: {
                select: {
                  id: true,
                  variantName: true,
                  unit: true,
                  mrpPaise: true,
                  product: { select: { name: true, brand: true } },
                },
              },
            },
          },
          handoverEvents: {
            orderBy: { collectedAt: "desc" },
            take: 1,
          },
        },
      },
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              memberships: { select: { role: true }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) throw new Error("Ticket not found.");

  if (!isAdmin && requestingUserId && ticket.userId !== requestingUserId) {
    throw new Error("You do not have permission to view this ticket.");
  }

  const sla = computeTicketSla(ticket.createdAt, ticket.acknowledgedAt, ticket.resolvedAt, new Date());

  const formattedMessages = ticket.messages.map((m) => ({
    id: m.id,
    message: m.message,
    createdAt: m.createdAt,
    sender: {
      id: m.sender.id,
      name: m.sender.name,
      role: m.sender.memberships[0]?.role || "RESIDENT",
    },
  }));

  return {
    ...ticket,
    messages: formattedMessages,
    sla,
  };
}

