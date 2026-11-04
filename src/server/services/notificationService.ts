import { prisma } from "@/server/db/client";
import { getNotificationAdapter } from "@/server/adapters/notification";
import { NotificationChannel } from "@prisma/client";
import { formatINR } from "@/lib/money";

export class NotificationService {
  private adapter = getNotificationAdapter();

  /**
   * Helper to broadcast notification across In-App, WhatsApp, and SMS channels
   */
  async dispatch(params: {
    userId: string;
    phone?: string;
    title: string;
    body: string;
    channels?: NotificationChannel[];
    data?: Record<string, unknown>;
  }) {
    const channels = params.channels || [
      NotificationChannel.IN_APP,
      NotificationChannel.WHATSAPP,
    ];

    const results = [];
    for (const channel of channels) {
      try {
        const res = await this.adapter.send({
          userId: params.userId,
          phone: params.phone,
          channel,
          title: params.title,
          body: params.body,
          data: params.data,
        });
        results.push(res);
      } catch (err) {
        console.error(`Failed to send notification via ${channel}:`, err);
      }
    }
    return results;
  }

  // -------------------------------------------------------------
  // Brief Triggers
  // -------------------------------------------------------------

  /** Trigger 1: Cycle opened for a society */
  async notifyCycleOpened(params: {
    societyId: string;
    societyName: string;
    cycleName: string;
    locksAt: Date;
  }) {
    // Notify all residents of the society
    const memberships = await prisma.membership.findMany({
      where: { societyId: params.societyId, status: "APPROVED" },
      include: { user: true },
    });

    const lockDateStr = params.locksAt.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });

    for (const m of memberships) {
      await this.dispatch({
        userId: m.userId,
        phone: m.user.phone,
        title: `Monthly Pool Open: ${params.cycleName}`,
        body: `Monthly grocery pool is now OPEN for ${params.societyName}! Add your staples before ${lockDateStr} to lock in wholesale slab prices.`,
        data: { trigger: "CYCLE_OPENED", societyId: params.societyId },
      });
    }
  }

  /** Trigger 2: Tier unlocked for a staple SKU */
  async notifyTierUnlocked(params: {
    societyId: string;
    skuName: string;
    newPricePaise: number;
    tierIndex: number;
  }) {
    const memberships = await prisma.membership.findMany({
      where: { societyId: params.societyId, status: "APPROVED" },
      include: { user: true },
    });

    for (const m of memberships) {
      await this.dispatch({
        userId: m.userId,
        phone: m.user.phone,
        title: `Tier ${params.tierIndex + 1} Unlocked: ${params.skuName}!`,
        body: `Society volume just unlocked a lower wholesale slab! Price dropped to ${formatINR(params.newPricePaise)}. Everyone in the pool saves more!`,
        data: { trigger: "TIER_UNLOCKED", skuName: params.skuName },
      });
    }
  }

  /** Trigger 3 & 4: 24-hour and 2-hour lock reminders */
  async notifyLockReminder(params: {
    societyId: string;
    cycleName: string;
    hoursRemaining: number;
  }) {
    const memberships = await prisma.membership.findMany({
      where: { societyId: params.societyId, status: "APPROVED" },
      include: { user: true },
    });

    for (const m of memberships) {
      await this.dispatch({
        userId: m.userId,
        phone: m.user.phone,
        title: `⏰ ${params.hoursRemaining} Hours Left: ${params.cycleName}`,
        body: `Order deadline locks in ${params.hoursRemaining} hours! Complete your basket to pool demand and save on wholesale prices.`,
        data: { trigger: `LOCK_REMINDER_${params.hoursRemaining}H` },
      });
    }
  }

  /** Trigger 5: Payment success */
  async notifyPaymentSuccess(params: {
    userId: string;
    phone?: string;
    orderId: string;
    pickupCode: string;
    amountPaise: number;
  }) {
    await this.dispatch({
      userId: params.userId,
      phone: params.phone,
      title: `Payment Received: ${formatINR(params.amountPaise)}`,
      body: `Your payment was confirmed. Order #${params.pickupCode} is pooled with your society. Pickup pass generated in your account.`,
      data: { trigger: "PAYMENT_SUCCESS", orderId: params.orderId },
    });
  }

  /** Trigger 6: Cycle locked */
  async notifyCycleLocked(params: {
    userId: string;
    phone?: string;
    cycleName: string;
    refundDeltaPaise: number;
  }) {
    const hasRefund = params.refundDeltaPaise > 0;
    const body = hasRefund
      ? `Cycle ${params.cycleName} has locked! Winning wholesale quotes secured. You saved ${formatINR(params.refundDeltaPaise)} from tier volume drops, credited to your wallet.`
      : `Cycle ${params.cycleName} has locked! Wholesale orders are dispatched to suppliers.`;

    await this.dispatch({
      userId: params.userId,
      phone: params.phone,
      title: `Cycle Locked: ${params.cycleName}`,
      body,
      data: { trigger: "CYCLE_LOCKED", refundDeltaPaise: params.refundDeltaPaise },
    });
  }

  /** Trigger 7: Refund issued */
  async notifyRefundIssued(params: {
    userId: string;
    phone?: string;
    amountPaise: number;
    reason: string;
  }) {
    await this.dispatch({
      userId: params.userId,
      phone: params.phone,
      title: `Refund Credited: ${formatINR(params.amountPaise)}`,
      body: `A refund of ${formatINR(params.amountPaise)} has been credited to your SocietyBuy wallet. Reason: ${params.reason}.`,
      data: { trigger: "REFUND_ISSUED", amountPaise: params.amountPaise },
    });
  }

  /** Trigger 8: Goods arrived at drop point */
  async notifyGoodsArrived(params: {
    societyId: string;
    dropPointName: string;
    cycleName: string;
  }) {
    const memberships = await prisma.membership.findMany({
      where: { societyId: params.societyId, status: "APPROVED" },
      include: { user: true },
    });

    for (const m of memberships) {
      await this.dispatch({
        userId: m.userId,
        phone: m.user.phone,
        title: `Truck Arrived at ${params.dropPointName}`,
        body: `Wholesale deliveries for ${params.cycleName} have arrived at ${params.dropPointName}. Society Captain is inspecting quantities.`,
        data: { trigger: "GOODS_ARRIVED" },
      });
    }
  }

  /** Trigger 9: Ready to collect */
  async notifyReadyToCollect(params: {
    userId: string;
    phone?: string;
    pickupCode: string;
    dropPointName: string;
  }) {
    await this.dispatch({
      userId: params.userId,
      phone: params.phone,
      title: `Ready for Pickup! PIN: ${params.pickupCode}`,
      body: `Your order is packed and ready for collection at ${params.dropPointName}. Show your 6-digit PIN or QR pass to the volunteer Captain.`,
      data: { trigger: "READY_TO_COLLECT", pickupCode: params.pickupCode },
    });
  }

  /** Trigger 10: Ticket / Issue update */
  async notifyTicketUpdate(params: {
    userId: string;
    phone?: string;
    ticketId: string;
    status: string;
    updateMessage: string;
  }) {
    await this.dispatch({
      userId: params.userId,
      phone: params.phone,
      title: `Support Ticket Update: ${params.status}`,
      body: params.updateMessage,
      data: { trigger: "ISSUE_UPDATE", ticketId: params.ticketId, status: params.status },
    });
  }
}

export const notificationService = new NotificationService();
