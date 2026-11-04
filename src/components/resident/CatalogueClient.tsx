"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import { useCart } from "@/components/cart/CartContext";
import { Search, ShoppingBag, Plus, Minus, Check, ArrowRight, ShieldCheck } from "lucide-react";

export interface CatalogueSkuItem {
  id: string;
  variantName: string;
  packSize: number;
  unit: string;
  mrpPaise: number;
  guaranteedPricePaise: number;
  imageUrl: string | null;
  product: {
    id: string;
    name: string;
    brand: string;
    isFood: boolean;
    fssaiNumber: string | null;
    category: {
      id: string;
      name: string;
      slug: string;
    };
  };
  quotesCount: number;
  lowestWholesalePaise: number;
  nextTierSavingsPaise?: number;
}

interface CatalogueClientProps {
  skus: CatalogueSkuItem[];
  categories: { id: string; name: string; slug: string }[];
  activeCycleName?: string;
  activeCycleLocksAt?: string;
}

export function CatalogueClient({
  skus,
  categories,
  activeCycleName,
  activeCycleLocksAt,
}: CatalogueClientProps) {
  const { items, addItem, updateQuantity } = useCart();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const filteredSkus = useMemo(() => {
    return skus.filter((sku) => {
      const matchesCategory =
        selectedCategory === "ALL" || sku.product.category.slug === selectedCategory;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sku.product.name.toLowerCase().includes(q) ||
        sku.product.brand.toLowerCase().includes(q) ||
        sku.variantName.toLowerCase().includes(q) ||
        sku.product.category.name.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [skus, selectedCategory, search]);

  // Compute unit price (Rs/kg or Rs/L)
  const getUnitPriceDisplay = (paise: number, packSize: number, unit: string) => {
    if (packSize <= 0) return "";
    const unitPaise = Math.round(paise / packSize);
    return `${formatINR(unitPaise)}/${unit}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Active Pool Announcement Banner */}
      {activeCycleName && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-3.5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-200/80 px-2 py-0.5 rounded-full">
              Current Open Society Pool
            </span>
            <h2 className="text-sm font-bold text-gray-900 mt-1">{activeCycleName}</h2>
          </div>
          {activeCycleLocksAt && (
            <div className="text-xs text-brand-800 font-semibold">
              Locks: {new Date(activeCycleLocksAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
            </div>
          )}
        </div>
      )}

      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Wholesale Staples Catalogue</h1>
          <p className="text-xs text-gray-500">
            Pool orders with your society neighbors to unlock tier discounts. Prices never exceed guaranteed MRP.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search basmati, atta, oil, tea..."
            className="w-full rounded-2xl border border-gray-300 pl-9 pr-4 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none shadow-2xs"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory("ALL")}
          className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
            selectedCategory === "ALL"
              ? "bg-brand-600 text-white shadow-2xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All Items ({skus.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.slug)}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
              selectedCategory === cat.slug
                ? "bg-brand-600 text-white shadow-2xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* SKU Cards Grid */}
      {filteredSkus.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-xs text-gray-500">
          No staple groceries match your search or selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkus.map((sku) => {
            const savingsPaise = Math.max(0, sku.mrpPaise - sku.guaranteedPricePaise);
            const savingsPercent = Math.round((savingsPaise / sku.mrpPaise) * 100);
            const cartItem = items.find((i) => i.skuId === sku.id);
            const qty = cartItem ? cartItem.quantity : 0;

            return (
              <div
                key={sku.id}
                id={`sku-${sku.id}`}
                className="group flex flex-col justify-between rounded-3xl border border-gray-200 bg-white p-4 shadow-2xs hover:border-brand-300 hover:shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                      {sku.product.category.name}
                    </span>

                    {savingsPercent > 0 && (
                      <span className="text-[10px] font-extrabold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Save {savingsPercent}%
                      </span>
                    )}
                  </div>

                  <Link href={`/sku/${sku.id}`} className="block group-hover:text-brand-700">
                    <span className="text-xs font-semibold text-gray-500 block">
                      {sku.product.brand}
                    </span>
                    <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">
                      {sku.product.name}
                    </h3>
                  </Link>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xs font-medium text-gray-500">{sku.variantName}</span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      ({getUnitPriceDisplay(sku.guaranteedPricePaise, sku.packSize, sku.unit)})
                    </span>
                  </div>

                  {sku.product.isFood && sku.product.fssaiNumber && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      <span>FSSAI Lic: {sku.product.fssaiNumber}</span>
                    </div>
                  )}

                  {/* Pricing Display */}
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-lg font-black text-gray-900">
                      {formatINR(sku.guaranteedPricePaise)}
                    </span>
                    <span className="text-xs text-gray-400 line-through">
                      MRP {formatINR(sku.mrpPaise)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/sku/${sku.id}`}
                    className="text-[11px] font-bold text-brand-700 hover:text-brand-800 flex items-center gap-0.5"
                  >
                    <span>View Slabs</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>

                  {qty === 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        addItem({
                          skuId: sku.id,
                          productName: `${sku.product.brand} - ${sku.product.name}`,
                          variantName: sku.variantName,
                          mrpPaise: sku.mrpPaise,
                          guaranteedPricePaise: sku.guaranteedPricePaise,
                          categoryName: sku.product.category.name,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-brand-700 active:scale-95 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center rounded-xl bg-brand-50 border border-brand-200 p-0.5 text-xs font-bold text-brand-900">
                      <button
                        type="button"
                        onClick={() => updateQuantity(sku.id, qty - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-gray-700 hover:bg-gray-100 shadow-2xs"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2.5 text-xs font-black">{qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(sku.id, qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-2xs"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

