"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { PerFlatPackingListResult } from "@/server/services/distributionService";
import {
  Printer,
  Search,
  Package,
  CheckSquare,
  Square,
  AlertTriangle,
  QrCode,
  Building,
  MapPin,
  Phone,
  User,
} from "lucide-react";

export function PackingListClient({
  packingData,
}: {
  packingData: PerFlatPackingListResult;
}) {
  const [search, setSearch] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredFlats = packingData.flats.filter((f) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      f.flatNumber.toLowerCase().includes(q) ||
      (f.tower && f.tower.toLowerCase().includes(q)) ||
      f.residentName.toLowerCase().includes(q) ||
      f.pickupCode.toLowerCase().includes(q) ||
      f.residentPhone.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Controls (Hidden on Print) */}
      <div className="print:hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search flat, resident, phone, or PIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            Showing {filteredFlats.length} of {packingData.flats.length} flats
          </span>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-black"
          >
            <Printer className="h-4 w-4" />
            Print Packing Sheet
          </button>
        </div>
      </div>

      {/* Printable Sheet Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full mb-1 border border-emerald-200">
              <Building className="h-3.5 w-3.5" />
              {packingData.society.name}
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              Per-Flat Distribution & Packing List
            </h1>
            <p className="text-xs text-gray-500">
              Cycle: {packingData.cycle.name} • Status: {packingData.cycle.status}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs">
            {packingData.society.dropPoint && (
              <div className="flex items-center sm:justify-end gap-1 text-gray-600 font-medium">
                <MapPin className="h-3.5 w-3.5 text-red-500" />
                Drop Point: {packingData.society.dropPoint.name}
              </div>
            )}
            <div className="mt-1 font-bold text-gray-900">
              {packingData.totalOrders} Orders • {packingData.totalUnitsDistributed} Net Units to Distribute
            </div>
          </div>
        </div>

        {/* Flats Grid */}
        <div className="space-y-4 pt-2">
          {filteredFlats.map((flat) => (
            <div
              key={flat.orderId}
              className="rounded-xl border border-gray-200 p-4 bg-white break-inside-avoid shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-2.5 gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white tracking-wide">
                    {flat.tower ? `${flat.tower} - ` : ""}Flat {flat.flatNumber}
                  </span>
                  <div className="text-xs">
                    <span className="font-bold text-gray-900">{flat.residentName}</span>
                    <span className="text-gray-400 ml-1.5">({flat.residentPhone})</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs text-amber-900">
                    Pickup PIN: <strong className="font-mono text-xs">{flat.pickupCode}</strong>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500">
                    {flat.totalUnits} items
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="mt-3 divide-y divide-gray-100">
                {flat.items.map((item, idx) => {
                  const checkKey = `${flat.orderId}-${item.skuId}-${idx}`;
                  const isChecked = !!checkedItems[checkKey];
                  const hasShortage = item.shortQty > 0;

                  return (
                    <div
                      key={checkKey}
                      onClick={() => toggleCheck(checkKey)}
                      className="py-2 flex items-center justify-between text-xs cursor-pointer hover:bg-gray-50/50 rounded px-1 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-gray-400 print:text-black">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-300 print:text-gray-600" />
                          )}
                        </span>
                        <div>
                          <span className="font-semibold text-gray-900">
                            {item.brand} {item.productName}
                          </span>
                          <span className="text-[11px] text-gray-500 ml-1.5">
                            ({item.variantName})
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-xs text-gray-900">
                          {item.netQty} {item.unit}
                        </span>
                        {hasShortage && (
                          <span className="block text-[10px] font-bold text-red-600">
                            Short: {item.shortQty} (Refunded)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
