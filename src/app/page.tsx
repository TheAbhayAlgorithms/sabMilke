import React from "react";
import Link from "next/link";
import { getCurrentSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { formatINR } from "@/lib/money";
import { TrendingDown, ArrowRight } from "lucide-react";
import { HomeHero } from "@/components/resident/HomeHero";

export default async function HomePage() {
  const session = await getCurrentSession();

  // Find active OPEN cycle for demo society
  const activeCycle = await prisma.cycle.findFirst({
    where: { status: "OPEN" },
    include: {
      society: true,
      cycleSkus: {
        include: {
          sku: {
            include: {
              product: true,
            },
          },
        },
      },
      orders: {
        where: {
          status: { in: ["PAID", "CONFIRMED"] },
        },
      },
    },
  });

  const totalPooledUnits = activeCycle?.cycleSkus.reduce((sum, cs) => sum + cs.pooledQuantity, 0) ?? 0;
  const totalSocietyOrders = activeCycle?.orders.length ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col px-4 py-6">
      {/* Hero / Society Status Banner */}
      <HomeHero
        societyName={activeCycle?.society.name ?? "Green Glen Heights"}
        totalPooledUnits={totalPooledUnits}
        totalSocietyOrders={totalSocietyOrders}
      />

      {/* Auth state helper card if logged in */}
      {session && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white font-bold">
              {session.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">{session.name}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-200 text-brand-900">
                  {session.activeRole}
                </span>
              </div>
              <span className="text-xs text-gray-600">
                {session.phone} • {session.memberships[0]?.societyName ?? "Green Glen Heights"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {session.activeRole === "PLATFORM_ADMIN" && (
              <Link href="/admin" className="px-3 py-1.5 bg-purple-700 text-white rounded-lg hover:bg-purple-800">
                Admin Console →
              </Link>
            )}
            {session.activeRole === "SUPPLIER" && (
              <Link href="/supplier" className="px-3 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800">
                Supplier Hub →
              </Link>
            )}
            {session.activeRole === "CAPTAIN" && (
              <Link href="/captain" className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800">
                Captain Hub →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* How It Works 3-Step Ladder */}
      <section className="mb-8">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-brand-600" />
          How Society Wholesale Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-800 font-bold text-sm mb-2">
              1
            </div>
            <h3 className="font-bold text-sm text-gray-900 mb-1">Pool Demand</h3>
            <p className="text-xs text-gray-600">
              Residents add staples to the basket. Pay guaranteed price upfront with zero price rise risk.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-800 font-bold text-sm mb-2">
              2
            </div>
            <h3 className="font-bold text-sm text-gray-900 mb-1">Unlock Volume Tiers</h3>
            <p className="text-xs text-gray-600">
              When the cycle locks, the system picks the cheapest supplier quote and refunds the delta into your wallet!
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-800 font-bold text-sm mb-2">
              3
            </div>
            <h3 className="font-bold text-sm text-gray-900 mb-1">Single Society Drop</h3>
            <p className="text-xs text-gray-600">
              Wholesalers deliver once to the society drop point. Show your pickup QR pass to collect from the volunteer Captain.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Staple Preview from Seed */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Featured Monthly Staples</h2>
          <Link href="/catalogue" className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1">
            See All 25 SKUs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {activeCycle?.cycleSkus.slice(0, 6).map((cs) => (
            <div key={cs.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                  {cs.sku.product.brand}
                </span>
                <h3 className="font-bold text-sm text-gray-900 mt-1">
                  {cs.sku.product.name} ({cs.sku.variantName})
                </h3>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-base font-extrabold text-gray-900">
                    {formatINR(cs.guaranteedPricePaise)}
                  </span>
                  <span className="text-xs text-gray-400 line-through">
                    {formatINR(cs.sku.mrpPaise)}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    Save {formatINR(cs.sku.mrpPaise - cs.guaranteedPricePaise)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500 font-medium">
                  {cs.pooledQuantity} pooled
                </span>
                <Link
                  href={`/sku/${cs.skuId}`}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-bold text-xs hover:bg-brand-700"
                >
                  View Tiers
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
