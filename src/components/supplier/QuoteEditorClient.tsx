"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { Truck, Plus, Trash2, CheckCircle2, AlertCircle, X, ShieldAlert } from "lucide-react";

interface SkuWithQuote {
  id: string;
  variantName: string;
  packSize: number | string;
  unit: string;
  mrpPaise: number;
  product: {
    brand: string;
    name: string;
    isFood: boolean;
    fssaiNumber: string | null;
    category: {
      name: string;
    };
  };
  activeQuote: {
    id: string;
    moq: number;
    leadTimeDays: number;
    validFrom: string;
    validTo: string;
    slabs: {
      id: string;
      minQty: number;
      maxQty: number | null;
      supplierPricePaise: number;
    }[];
  } | null;
}

interface QuoteEditorClientProps {
  supplierName: string;
  skus: SkuWithQuote[];
}

interface EditableSlab {
  minQty: number;
  maxQty: number | null;
  supplierPricePaise: number;
}

export function QuoteEditorClient({ supplierName, skus }: QuoteEditorClientProps) {
  const [selectedSku, setSelectedSku] = useState<SkuWithQuote | null>(null);
  const [moq, setMoq] = useState(5);
  const [leadTimeDays, setLeadTimeDays] = useState(2);
  const [validFrom, setValidFrom] = useState(() => new Date().toISOString().split("T")[0]);
  const [validTo, setValidTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const [slabs, setSlabs] = useState<EditableSlab[]>([
    { minQty: 1, maxQty: 19, supplierPricePaise: 1000 },
    { minQty: 20, maxQty: 49, supplierPricePaise: 950 },
    { minQty: 50, maxQty: null, supplierPricePaise: 900 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const openQuoteModal = (sku: SkuWithQuote) => {
    setSelectedSku(sku);
    setError(null);
    setSuccess(null);

    if (sku.activeQuote) {
      setMoq(sku.activeQuote.moq);
      setLeadTimeDays(sku.activeQuote.leadTimeDays);
      setValidFrom(new Date(sku.activeQuote.validFrom).toISOString().split("T")[0]);
      setValidTo(new Date(sku.activeQuote.validTo).toISOString().split("T")[0]);
      setSlabs(
        sku.activeQuote.slabs.map((s) => ({
          minQty: s.minQty,
          maxQty: s.maxQty,
          supplierPricePaise: s.supplierPricePaise,
        }))
      );
    } else {
      // Default 3 tiers around 80%, 75%, 70% of MRP
      const p1 = Math.round(sku.mrpPaise * 0.8);
      const p2 = Math.round(sku.mrpPaise * 0.75);
      const p3 = Math.round(sku.mrpPaise * 0.7);
      setMoq(5);
      setLeadTimeDays(2);
      setSlabs([
        { minQty: 1, maxQty: 19, supplierPricePaise: p1 },
        { minQty: 20, maxQty: 49, supplierPricePaise: p2 },
        { minQty: 50, maxQty: null, supplierPricePaise: p3 },
      ]);
    }
  };

  const handleSlabChange = (index: number, field: keyof EditableSlab, value: number | null) => {
    const updated = [...slabs];
    updated[index] = { ...updated[index], [field]: value };
    setSlabs(updated);
  };

  const addSlabTier = () => {
    const lastSlab = slabs[slabs.length - 1];
    const prevMax = lastSlab ? (lastSlab.maxQty || lastSlab.minQty + 10) : 0;
    const newMin = prevMax + 1;

    // Adjust previous slab to be bounded
    const updated = [...slabs];
    if (lastSlab && lastSlab.maxQty === null) {
      updated[updated.length - 1].maxQty = newMin - 1;
    }

    updated.push({
      minQty: newMin,
      maxQty: null,
      supplierPricePaise: Math.round((lastSlab?.supplierPricePaise || 1000) * 0.95),
    });

    setSlabs(updated);
  };

  const removeSlabTier = (index: number) => {
    if (slabs.length <= 1) return;
    const updated = slabs.filter((_, i) => i !== index);
    // Make the last slab unbounded
    updated[updated.length - 1].maxQty = null;
    setSlabs(updated);
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/supplier/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skuId: selectedSku.id,
          moq: Number(moq),
          leadTimeDays: Number(leadTimeDays),
          validFrom: new Date(validFrom).toISOString(),
          validTo: new Date(validTo).toISOString(),
          slabs,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit quote");

      setSuccess("Quote submitted successfully!");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Wholesale Quote & Slabs Manager
          </h1>
          <p className="text-xs text-gray-500">
            Supplier: <strong className="text-gray-900">{supplierName}</strong>. Configure volume discount tiers for housing society orders.
          </p>
        </div>
      </div>

      {/* SKUs List */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-700 uppercase">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Brand & Product</th>
              <th className="px-4 py-3">Pack & MRP</th>
              <th className="px-4 py-3">Your Active Quote</th>
              <th className="px-4 py-3">MOQ / Lead Time</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {skus.map((sku) => (
              <tr key={sku.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-900 font-semibold">
                  {sku.product.category.name}
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-900">{sku.product.brand}</div>
                  <div className="text-[11px] text-gray-500">{sku.product.name}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{sku.variantName}</div>
                  <div className="font-bold text-gray-900">MRP {formatINR(sku.mrpPaise)}</div>
                </td>
                <td className="px-4 py-3">
                  {sku.activeQuote ? (
                    <div className="space-y-0.5">
                      <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        {sku.activeQuote.slabs.length} Tiers Active
                      </span>
                      <div className="text-[11px] text-gray-600">
                        Best: {formatINR(sku.activeQuote.slabs[sku.activeQuote.slabs.length - 1].supplierPricePaise)}
                      </div>
                    </div>
                  ) : (
                    <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
                      No Quote Submitted
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {sku.activeQuote ? (
                    <span>{sku.activeQuote.moq} MOQ • {sku.activeQuote.leadTimeDays}d lead</span>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openQuoteModal(sku)}
                    className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100"
                  >
                    {sku.activeQuote ? "Edit Slabs" : "Submit Quote"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quote & Slabs Modal */}
      {selectedSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <form
            onSubmit={handleSubmitQuote}
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Configure Quote & Volume Slabs
                </h2>
                <p className="text-xs text-gray-500">
                  {selectedSku.product.brand} - {selectedSku.product.name} ({selectedSku.variantName})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSku(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* MRP Warning Alert */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-2 text-amber-900 font-medium">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Maximum Retail Price (MRP): <strong>{formatINR(selectedSku.mrpPaise)}</strong>.
                Rule 10: Slab prices must never exceed this MRP.
              </span>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-red-700 font-semibold border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Quote Logistics Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">MOQ (Units)</label>
                <input
                  type="number"
                  min={1}
                  value={moq}
                  onChange={(e) => setMoq(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 p-2 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Lead Time (Days)</label>
                <input
                  type="number"
                  min={1}
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 p-2 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Valid From</label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Valid Till</label>
                <input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                  required
                />
              </div>
            </div>

            {/* Volume Slabs Ladder */}
            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Volume Discount Slabs</h3>
                  <p className="text-[11px] text-gray-500">
                    Slabs must be contiguous and non-overlapping. Highest tier has no upper limit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSlabTier}
                  className="inline-flex items-center gap-1 rounded-lg bg-white border border-gray-300 px-2.5 py-1 font-bold text-gray-700 hover:bg-gray-100"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-600" />
                  Add Tier
                </button>
              </div>

              <div className="space-y-2">
                {slabs.map((slab, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white p-3 rounded-xl border border-gray-200"
                  >
                    <div className="font-bold text-gray-700 whitespace-nowrap min-w-[60px]">
                      Tier {idx + 1}:
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-500">From</span>
                      <input
                        type="number"
                        min={1}
                        value={slab.minQty}
                        onChange={(e) => handleSlabChange(idx, "minQty", Number(e.target.value))}
                        className="w-16 rounded-lg border border-gray-300 p-1.5 text-center font-bold"
                        required
                      />
                      <span className="text-[11px] text-gray-500">to</span>
                      <input
                        type="number"
                        disabled={idx === slabs.length - 1 && slab.maxQty === null}
                        value={slab.maxQty ?? ""}
                        placeholder="∞"
                        onChange={(e) =>
                          handleSlabChange(
                            idx,
                            "maxQty",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        className="w-16 rounded-lg border border-gray-300 p-1.5 text-center font-bold disabled:bg-gray-100"
                      />
                      <span className="text-[11px] text-gray-500">units</span>
                    </div>

                    <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
                      <span className="text-[11px] text-gray-500">Price (paise):</span>
                      <input
                        type="number"
                        min={1}
                        value={slab.supplierPricePaise}
                        onChange={(e) =>
                          handleSlabChange(idx, "supplierPricePaise", Number(e.target.value))
                        }
                        className="w-24 rounded-lg border border-gray-300 p-1.5 font-mono font-bold text-right"
                        required
                      />
                      <span className="text-xs font-bold text-emerald-700 min-w-[70px]">
                        = {formatINR(slab.supplierPricePaise || 0)}
                      </span>

                      {slabs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSlabTier(idx)}
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedSku(null)}
                className="rounded-xl px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving Quote..." : "Submit Quote"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
