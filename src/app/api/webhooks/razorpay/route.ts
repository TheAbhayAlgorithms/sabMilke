import { NextRequest, NextResponse } from "next/server";
import { processRazorpayWebhook } from "@/server/services/webhookService";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    let eventId = req.headers.get("x-razorpay-event-id") || "";

    if (!eventId) {
      try {
        const parsed = JSON.parse(rawBody);
        eventId = parsed.id || `evt_${Date.now()}`;
      } catch {
        eventId = `evt_${Date.now()}`;
      }
    }

    const result = await processRazorpayWebhook(rawBody, signature, eventId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[WEBHOOK ERROR]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook processing failed" },
      { status: 400 }
    );
  }
}
