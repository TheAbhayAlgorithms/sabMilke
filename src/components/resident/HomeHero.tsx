"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/i18n";
import { ShoppingBag } from "lucide-react";

interface HomeHeroProps {
  societyName: string;
  totalPooledUnits: number;
  totalSocietyOrders: number;
}

export function HomeHero({ societyName, totalPooledUnits, totalSocietyOrders }: HomeHeroProps) {
  const { t } = useLanguage();

  return (
    <section className="mb-6 rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 p-6 text-white shadow-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-600/60 px-3 py-1 text-xs font-semibold text-brand-100 backdrop-blur-xs mb-3 border border-brand-500/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {societyName} • {t("home.discount_ladder")}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t("app.tagline")}
          </h1>
          <p className="mt-1 max-w-xl text-xs sm:text-sm text-brand-100">
            {t("app.savings_sub")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Link
            href="/catalogue"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-900 shadow-sm hover:bg-brand-50 transition-colors"
          >
            <ShoppingBag className="h-4 w-4 text-brand-700" />
            <span>{t("home.order_now")}</span>
          </Link>
          <Link
            href="/join"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600/60 border border-brand-400/40 px-4 py-3 text-sm font-bold text-white hover:bg-brand-600/80 transition-colors"
          >
            <span>Join Society</span>
          </Link>
        </div>
      </div>

      {/* Live Pool Stats */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4 border-t border-brand-600/40 pt-4 text-center">
        <div className="rounded-2xl bg-brand-900/40 p-2.5 sm:p-3 backdrop-blur-xs border border-brand-700/30">
          <span className="block text-[11px] font-medium text-brand-200">Cycle Status</span>
          <span className="text-sm sm:text-base font-extrabold text-white">OPEN</span>
        </div>
        <div className="rounded-2xl bg-brand-900/40 p-2.5 sm:p-3 backdrop-blur-xs border border-brand-700/30">
          <span className="block text-[11px] font-medium text-brand-200">{t("home.pooled_units")}</span>
          <span className="text-sm sm:text-base font-extrabold text-white">{totalPooledUnits}</span>
        </div>
        <div className="rounded-2xl bg-brand-900/40 p-2.5 sm:p-3 backdrop-blur-xs border border-brand-700/30">
          <span className="block text-[11px] font-medium text-brand-200">Flats Joined</span>
          <span className="text-sm sm:text-base font-extrabold text-white">{totalSocietyOrders} / 100</span>
        </div>
      </div>
    </section>
  );
}

