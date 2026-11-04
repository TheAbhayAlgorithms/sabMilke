"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import {
  Tag,
  ArrowLeft,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Building,
} from "lucide-react";

interface BenchmarkItem {
  id: string;
  skuId: string;
  retailerName: string;
  pricePaise: number;
  checkedAt: string;
  sku: {
    id: string;
    name: string;
    brand: string;
    variantName: string;
    unit: string;
    mrpPaise: number;
    category?: { name: string };
  };
}

interface SkuOption {
  id: string;
  name: string;
  brand: string;
  variantName: string;
  mrpPaise: number;
}

interface AdminBenchmarkClientProps {
  initialBenchmarks: BenchmarkItem[];
  skus: SkuOption[];
}

export function AdminBenchmarkClient({
  initialBenchmarks,
  skus,
}: AdminBenchmarkClientProps) {
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>(initialBenchmarks);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRetailer, setSelectedRetailer] = useState("ALL");

  // Edit/Add Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalSkuId, setModalSkuId] = useState(skus[0]?.id || "");
  const [modalRetailer, setModalRetailer] = useState("Blinkit");
  const [modalPriceRupees, setModalPriceRupees] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const retailers = ["Blinkit", "Zepto", "Local Kirana", "BigBasket", "Instamart"];

  const filteredBenchmarks = benchmarks.filter((b) => {
    if (selectedRetailer !== "ALL" && b.retailerName !== selectedRetailer) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.sku.name.toLowerCase().includes(q) ||
        b.sku.brand.toLowerCase().includes(q) ||
        b.retailerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedSkuObj = skus.find((s) => s.id === modalSkuId);

  function openEditModal(skuId: string, retailer: string, currentPricePaise?: number) {
    setModalSkuId(skuId);
    setModalRetailer(retailer);
    setModalPriceRupees(currentPricePaise ? (currentPricePaise / 100).toString() : "");
    setModalError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setModalError("");

    const priceRupees = Number(modalPriceRupees);
    if (isNaN(priceRupees) || priceRupees <= 0) {
      setModalError("Please enter a valid price in Rupees.");
      return;
    }

    const pricePaise = Math.round(priceRupees * 100);

    if (selectedSkuObj && pricePaise > selectedSkuObj.mrpPaise) {
      setModalError(`Price cannot exceed MRP of ${formatINR(selectedSkuObj.mrpPaise)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/benchmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skuId: modalSkuId,
          retailerName: modalRetailer,
          pricePaise,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update benchmark price");

      // Refresh local list
      const updatedList = benchmarks.filter(
        (b) => !(b.skuId === modalSkuId && b.retailerName === modalRetailer)
      );
      if (selectedSkuObj) {
        updatedList.push({
          ...data.benchmark,
          sku: {
            id: selectedSkuObj.id,
            name: selectedSkuObj.name,
            brand: selectedSkuObj.brand,
            variantName: selectedSkuObj.variantName,
            unit: "",
            mrpPaise: selectedSkuObj.mrpPaise,
          },
        });
      }
      setBenchmarks(updatedList);
      setShowModal(false);
      setSuccessMessage(`Updated ${modalRetailer} benchmark for ${selectedSkuObj?.name}`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setModalError(err.message || "Failed to save benchmark price.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Retail Benchmark Prices
              </h1>
              <p className="text-xs text-gray-500">
                Market benchmark rates (Zepto, Blinkit, Kirana) used for &quot;You saved ₹X versus retail&quot; displays
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Console
          </Link>
          <button
            onClick={() => {
              setModalPriceRupees("");
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 px-3.5 py-1.5 text-xs font-bold text-white transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Benchmark
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 mb-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU or retailer..."
            className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-xs text-gray-800 focus:border-purple-500 focus:outline-hidden"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
          {["ALL", "Blinkit", "Zepto", "Local Kirana", "BigBasket"].map((ret) => (
            <button
              key={ret}
              onClick={() => setSelectedRetailer(ret)}
              className={`rounded-xl px-3 py-2 whitespace-nowrap transition-colors ${
                selectedRetailer === ret
                  ? "bg-purple-700 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {ret}
            </button>
          ))}
        </div>
      </div>

      {/* Benchmarks Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
              <tr>
                <th className="px-4 py-3">Staple SKU</th>
                <th className="px-4 py-3">Retailer</th>
                <th className="px-4 py-3 text-right">Retail Price</th>
                <th className="px-4 py-3 text-right">MRP</th>
                <th className="px-4 py-3 text-right">Discount vs MRP</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBenchmarks.map((b) => {
                const discountPaise = Math.max(0, b.sku.mrpPaise - b.pricePaise);
                const discountPct = b.sku.mrpPaise > 0 ? ((discountPaise / b.sku.mrpPaise) * 100).toFixed(1) : 0;
                return (
                  <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {b.sku.brand} {b.sku.name} ({b.sku.variantName})
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 font-bold text-gray-700">
                        {b.retailerName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">
                      {formatINR(b.pricePaise)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 line-through">
                      {formatINR(b.sku.mrpPaise)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {discountPct}% off
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEditModal(b.skuId, b.retailerName, b.pricePaise)}
                        className="rounded-lg p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                        title="Edit Price"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">
                Set Benchmark Retail Price
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-4 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  SKU
                </label>
                <select
                  value={modalSkuId}
                  onChange={(e) => setModalSkuId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-purple-500 focus:outline-hidden"
                >
                  {skus.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.brand} {s.name} ({s.variantName}) - MRP {formatINR(s.mrpPaise)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Retailer Name
                </label>
                <select
                  value={modalRetailer}
                  onChange={(e) => setModalRetailer(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-purple-500 focus:outline-hidden"
                >
                  {retailers.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Price in Rupees (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={modalPriceRupees}
                    onChange={(e) => setModalPriceRupees(e.target.value)}
                    placeholder="e.g. 720"
                    className="w-full rounded-xl border border-gray-300 pl-7 pr-3 py-2 text-xs font-bold text-gray-900 focus:border-purple-500 focus:outline-hidden"
                    required
                  />
                </div>
                {selectedSkuObj && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Maximum allowed is MRP: {formatINR(selectedSkuObj.mrpPaise)}.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-purple-700 hover:bg-purple-800 px-4 py-2 text-xs font-bold text-white transition-colors"
                >
                  {isSubmitting ? "Saving..." : "Save Benchmark"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
