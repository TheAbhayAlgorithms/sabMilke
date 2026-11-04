import { prisma } from "@/server/db/client";
import { getOtpAdapter } from "@/server/adapters/otp";
import { createSessionToken, SessionPayload, SessionMembership } from "@/server/auth/session";
import { Role } from "@prisma/client";

const otpAdapter = getOtpAdapter();

export async function requestOtp(phone: string): Promise<{ success: boolean; messageId: string }> {
  const cleanPhone = phone.trim().replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    throw new Error("Invalid phone number. Must contain at least 10 digits.");
  }

  // Generate 6-digit OTP (in mock mode, 123456 is standard)
  const otp = process.env.NODE_ENV === "production"
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : "123456";

  return otpAdapter.sendOtp(cleanPhone, otp);
}

export async function verifyOtpAndLogin(
  phone: string,
  otp: string
): Promise<{ token: string; session: SessionPayload }> {
  const cleanPhone = phone.trim().replace(/\D/g, "");
  const isValid = otpAdapter.verifyOtp(cleanPhone, otp, "123456");

  if (!isValid) {
    throw new Error("Invalid or expired OTP");
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { phone: cleanPhone },
    include: {
      memberships: {
        include: {
          society: true,
          flat: true,
        },
      },
      supplierUser: {
        include: {
          supplier: true,
        },
      },
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: cleanPhone,
        name: `Resident ${cleanPhone.slice(-4)}`,
        isPhoneVerified: true,
        wallet: {
          create: {
            balancePaise: 0,
          },
        },
      },
      include: {
        memberships: {
          include: {
            society: true,
            flat: true,
          },
        },
        supplierUser: {
          include: {
            supplier: true,
          },
        },
      },
    });
  } else if (!user.isPhoneVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true },
    });
  }

  // Build typed memberships
  const memberships: SessionMembership[] = user.memberships.map((m) => ({
    societyId: m.societyId,
    societyName: m.society.name,
    flatId: m.flatId,
    flatNumber: m.flat.flatNumber,
    role: m.role,
    status: m.status,
  }));

  // Determine active role & primary context
  let activeRole: Role | "SUPPLIER" = Role.RESIDENT;
  let activeSocietyId: string | undefined = undefined;
  let activeFlatId: string | undefined = undefined;
  const supplierId: string | undefined = user.supplierUser?.supplierId;

  if (memberships.some((m) => m.role === Role.PLATFORM_ADMIN)) {
    activeRole = Role.PLATFORM_ADMIN;
    const adminMem = memberships.find((m) => m.role === Role.PLATFORM_ADMIN);
    activeSocietyId = adminMem?.societyId;
  } else if (user.supplierUser) {
    activeRole = "SUPPLIER";
  } else if (memberships.some((m) => m.role === Role.CAPTAIN)) {
    activeRole = Role.CAPTAIN;
    const captMem = memberships.find((m) => m.role === Role.CAPTAIN);
    activeSocietyId = captMem?.societyId;
    activeFlatId = captMem?.flatId;
  } else if (memberships.some((m) => m.role === Role.SOCIETY_ADMIN)) {
    activeRole = Role.SOCIETY_ADMIN;
    const socMem = memberships.find((m) => m.role === Role.SOCIETY_ADMIN);
    activeSocietyId = socMem?.societyId;
    activeFlatId = socMem?.flatId;
  } else if (memberships.length > 0) {
    activeRole = memberships[0].role;
    activeSocietyId = memberships[0].societyId;
    activeFlatId = memberships[0].flatId;
  }

  const sessionPayload: SessionPayload = {
    userId: user.id,
    phone: user.phone,
    name: user.name,
    activeRole,
    activeSocietyId,
    activeFlatId,
    supplierId,
    memberships,
  };

  const token = await createSessionToken(sessionPayload);
  return { token, session: sessionPayload };
}
