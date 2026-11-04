import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { getActiveConsent } from "@/server/services/consentService";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/resident/ProfileClient";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?callbackUrl=/profile");
  }

  const [user, consent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        memberships: {
          include: { society: true, flat: true },
        },
      },
    }),
    getActiveConsent(session.userId),
  ]);

  if (!user) {
    redirect("/login");
  }

  const primaryMembership = user.memberships[0] || null;

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name,
        phone: user.phone,
        membership: primaryMembership
          ? {
              societyName: primaryMembership.society.name,
              flatNumber: primaryMembership.flat.flatNumber,
              tower: primaryMembership.flat.tower,
              role: primaryMembership.role,
            }
          : null,
      }}
      activeConsentPurposes={consent ? consent.purposes : []}
    />
  );
}

