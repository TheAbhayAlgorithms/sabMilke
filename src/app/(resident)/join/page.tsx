import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { JoinSocietyClient } from "@/components/resident/JoinSocietyClient";

export default async function JoinPage({
  searchParams,
}: {
  searchParams?: { code?: string };
}) {
  const session = await getCurrentSession();

  // If user not logged in, redirect to login with callback to join
  if (!session) {
    const returnUrl = searchParams?.code ? `/join?code=${searchParams.code}` : "/join";
    redirect(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
  }

  return (
    <JoinSocietyClient
      initialCode={searchParams?.code}
      initialUserName={session.name}
    />
  );
}

