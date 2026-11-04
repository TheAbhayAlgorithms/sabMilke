export interface TicketSlaStatus {
  isAcknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgementDeadline: Date;
  acknowledgementRemainingHours: number;
  isAcknowledgementBreached: boolean;
  resolutionTarget: Date;
  resolutionRemainingDays: number;
  isResolutionBreached: boolean;
  isResolved: boolean;
  resolvedAt: Date | null;
}

/**
 * Evaluates 48-hour acknowledgement SLA and 30-day resolution SLA.
 */
export function computeTicketSla(
  createdAt: Date,
  acknowledgedAt: Date | null,
  resolvedAt: Date | null,
  now: Date = new Date()
): TicketSlaStatus {
  // 48 hours acknowledgement timer
  const acknowledgementDeadline = new Date(
    createdAt.getTime() + 48 * 60 * 60 * 1000
  );
  const isAcknowledged = Boolean(acknowledgedAt);
  const ackDiffMs = acknowledgementDeadline.getTime() - now.getTime();
  const acknowledgementRemainingHours = Math.max(
    0,
    Math.round(ackDiffMs / (60 * 60 * 1000))
  );
  const isAcknowledgementBreached =
    !isAcknowledged && now.getTime() > acknowledgementDeadline.getTime();

  // 30 days resolution target
  const resolutionTarget = new Date(
    createdAt.getTime() + 30 * 24 * 60 * 60 * 1000
  );
  const isResolved = Boolean(resolvedAt);
  const resDiffMs = resolutionTarget.getTime() - now.getTime();
  const resolutionRemainingDays = Math.max(
    0,
    Math.round(resDiffMs / (24 * 60 * 60 * 1000))
  );
  const isResolutionBreached =
    !isResolved && now.getTime() > resolutionTarget.getTime();

  return {
    isAcknowledged,
    acknowledgedAt,
    acknowledgementDeadline,
    acknowledgementRemainingHours,
    isAcknowledgementBreached,
    resolutionTarget,
    resolutionRemainingDays,
    isResolutionBreached,
    isResolved,
    resolvedAt,
  };
}

/**
 * Checks if an order is within the 24-hour issue reporting window following handover.
 */
export function isOrderEligibleForTicket(
  orderStatus: string,
  handedOverAt?: Date | null,
  now: Date = new Date()
): { eligible: boolean; reason?: string } {
  // If order was cancelled or disputed
  if (orderStatus === "CANCELLED") {
    return {
      eligible: false,
      reason: "Cannot raise an issue for a cancelled order.",
    };
  }

  // If handed over, check 24-hour window
  if (handedOverAt) {
    const elapsedMs = now.getTime() - handedOverAt.getTime();
    const elapsedHours = elapsedMs / (60 * 60 * 1000);
    if (elapsedHours > 24) {
      return {
        eligible: false,
        reason: `Reporting window expired. Issues must be raised within 24 hours of goods handover (elapsed: ${Math.round(elapsedHours)}h).`,
      };
    }
  }

  return { eligible: true };
}
