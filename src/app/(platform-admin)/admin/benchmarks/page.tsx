import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { listBenchmarkPrices } from "@/server/services/benchmarkService";
import { AdminBenchmarkClient } from "@/components/admin/AdminBenchmarkClient";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminBenchmarksPage() {
  const session = await getCurrentSession();
  if (!session?.userId) {
    redirect("/login?next=/admin/benchmarks");
  }

  const isPlatformAdmin =
    session.activeRole === Role.PLATFORM_ADMIN ||
    session.memberships.some((m) => m.role === Role.PLATFORM_ADMIN);

  if (!isPlatformAdmin) {
    redirect("/");
  }

  const [rawBenchmarks, rawSkus] = await Promise.all([
    listBenchmarkPrices(),
    prisma.sku.findMany({
      include: {
        product: { select: { name: true, brand: true } },
      },
    }),
  ]);

  const skus = rawSkus.map((s) => ({
    id: s.id,
    name: s.product.name,
    brand: s.product.brand,
    variantName: s.variantName,
    mrpPaise: s.mrpPaise,
  }));

  const benchmarks = rawBenchmarks.map((b) => ({
    id: b.id,
    skuId: b.skuId,
    retailerName: b.retailerName,
    pricePaise: b.pricePaise,
    checkedAt: b.checkedAt.toISOString(),
    sku: {
      id: b.sku.id,
      name: b.sku.product.name,
      brand: b.sku.product.brand,
      variantName: b.sku.variantName,
      unit: b.sku.unit,
      mrpPaise: b.sku.mrpPaise,
      category: b.sku.product.category ? { name: b.sku.product.category.name } : undefined,
    },
  }));

  return <AdminBenchmarkClient initialBenchmarks={benchmarks} skus={skus} />;
}
