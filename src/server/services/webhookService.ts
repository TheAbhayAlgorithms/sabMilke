import { prisma } from "@/server/db/client";
import { getPaymentAdapter } from "@/server/adapters/payment";
import { recordAuditLog } from "@/server/services/auditService";
import { confirmOrderPayment } from "@/server/services/orderService";

export interface WebhookProcessingResult {
  received: boolean;
  duplicate: boolean;
  orderId?: string;
  actionTaken?: string;
}

export async function processRazorpayWebhook(
  rawBody: string,
  signature: string,
  eventId: string
): Promise<WebhookProcessingResult> {
  const paymentAdapter = getPaymentAdapter();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "mock_secret";

  // 1. Signature Verification
  const isValidSignature = paymentAdapter.verifyWebhookSignature(rawBody, signature, secret);
  if (!isValidSignature) {
    throw new Error("Invalid Razorpay webhook signature.");
  }

  // 2. Idempotency Check: Rule 4 - Payment webhooks are idempotent (store provider event id, ignore repeats)
  const existingEvent = await prisma.providerEvent.findUnique({
    where: { eventId },
  });

  if (existingEvent) {
    console.log(`[WEBHOOK IDEMPOTENT] Event ${eventId} already processed at ${existingEvent.processedAt}. Ignoring repeat.`);
    return {
      received: true,
      duplicate: true,
      actionTaken: "IGNORED_DUPLICATE",
    };
  }

  // Parse webhook payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    throw new Error("Invalid JSON in webhook payload.");
  }

  const eventType = payload.event || "payment.captured";
  const paymentEntity = payload.payload?.payment?.entity || payload.payment || {};
  const providerOrderId = paymentEntity.order_id || payload.order_id;
  const providerPaymentId = paymentEntity.id || `pay_${Date.now()}`;
  const paymentMethod = paymentEntity.method || "UPI";
  const upiVpa = paymentEntity.vpa || null;

  return prisma.$transaction(async (tx) => {
    // 3. Store ProviderEvent to lock event idempotency
    await tx.providerEvent.create({
      data: {
        provider: "RAZORPAY",
        eventId,
        eventType,
        payload,
      },
    });

    let targetOrderId = payload.notes?.orderId || paymentEntity.notes?.orderId;

    if (!targetOrderId && providerOrderId) {
      const paymentRecord = await tx.payment.findFirst({
        where: { providerOrderId },
        include: { order: true },
      });
      targetOrderId = paymentRecord?.orderId;
    }

    if (!targetOrderId) {
      // If no matching order found, record in audit logs and exit cleanly
      await recordAuditLog(
        {
          action: "WEBHOOK_ORPHAN_EVENT",
          entity: "ProviderEvent",
          entityId: eventId,
          after: { eventType, providerOrderId, providerPaymentId },
        },
        tx
      );

      return {
        received: true,
        duplicate: false,
        actionTaken: "NO_MATCHING_ORDER",
      };
    }

    // 4. Confirm Order Payment (Idempotent inside orderService)
    await confirmOrderPayment(null, {
      orderId: targetOrderId,
      providerPaymentId,
      providerOrderId,
      paymentMethod,
      upiVpa,
    });

    await recordAuditLog(
      {
        action: "WEBHOOK_PAYMENT_PROCESSED",
        entity: "Order",
        entityId: targetOrderId,
        after: {
          eventId,
          eventType,
          providerPaymentId,
        },
      },
      tx
    );

    return {
      received: true,
      duplicate: false,
      orderId: targetOrderId,
      actionTaken: "PAYMENT_CONFIRMED",
    };
  });
}

