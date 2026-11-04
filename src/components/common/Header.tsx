"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/i18n";
import { useCart } from "@/components/cart/CartContext";
import { LanguageSwitch } from "./LanguageSwitch";
import {
  ShoppingBag,
  ShoppingCart,
  Users,
  ShieldCheck,
  Truck,
  LogOut,
  Home,
  Wallet,
  PiggyBank,
  PackageCheck,
  User,
} from "lucide-react";

interface HeaderProps {
  user?: {
    name: string;
    phone: string;
    activeRole: string;
    activeSocietyName?: string;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const { t } = useLanguage();
  const { totalItemsCount } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white font-bold shadow-sm">
            SB
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-gray-900 block leading-tight">
              {t("app.name")}
            </span>
            <span className="text-[10px] font-medium text-brand-700 block leading-none">
              {user?.activeSocietyName ?? "Housing Society Pool"}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitch />

          <Link
            href="/cart"
            className="relative flex items-center justify-center h-8 px-2.5 rounded-lg bg-brand-50 text-brand-800 font-bold text-xs hover:bg-brand-100 transition-colors"
            title="Shopping Cart"
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            <span className="hidden xs:inline">Cart</span>
            {totalItemsCount > 0 && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-extrabold text-white">
                {totalItemsCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-1.5 ml-1">
              <span className="hidden sm:inline-block text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {user.activeRole}
              </span>
              <a
                href="/api/auth/logout"
                className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-100 transition-colors"
                title={t("nav.logout")}
              >
                <LogOut className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Role Navigation Bar */}
      <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-1.5 overflow-x-auto text-xs">
        <div className="mx-auto flex max-w-5xl items-center gap-4 text-gray-600 font-medium whitespace-nowrap">
          <Link href="/" className="flex items-center gap-1 hover:text-brand-700">
            <Home className="h-3.5 w-3.5" />
            <span>{t("nav.home")}</span>
          </Link>
          <Link href="/catalogue" className="flex items-center gap-1 hover:text-brand-700">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>{t("nav.catalogue")}</span>
          </Link>

          {user && (
            <>
              <Link href="/orders" className="flex items-center gap-1 hover:text-brand-700">
                <PackageCheck className="h-3.5 w-3.5" />
                <span>Orders</span>
              </Link>
              <Link href="/wallet" className="flex items-center gap-1 hover:text-brand-700">
                <Wallet className="h-3.5 w-3.5" />
                <span>Wallet</span>
              </Link>
              <Link href="/savings" className="flex items-center gap-1 hover:text-brand-700">
                <PiggyBank className="h-3.5 w-3.5" />
                <span>My Savings</span>
              </Link>
              <Link href="/profile" className="flex items-center gap-1 hover:text-brand-700">
                <User className="h-3.5 w-3.5" />
                <span>Profile</span>
              </Link>
            </>
          )}

          {user && (user.activeRole === "CAPTAIN" || user.activeRole === "PLATFORM_ADMIN") && (
            <Link href="/captain/participation" className="flex items-center gap-1 text-emerald-700 font-semibold">
              <Users className="h-3.5 w-3.5" />
              <span>Captain Participation</span>
            </Link>
          )}
          {user && (user.activeRole === "SUPPLIER" || user.activeRole === "PLATFORM_ADMIN") && (
            <Link href="/supplier" className="flex items-center gap-1 text-blue-700 font-semibold">
              <Truck className="h-3.5 w-3.5" />
              <span>{t("nav.supplier")}</span>
            </Link>
          )}
          {user && user.activeRole === "PLATFORM_ADMIN" && (
            <Link href="/admin" className="flex items-center gap-1 text-purple-700 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{t("nav.admin")}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

