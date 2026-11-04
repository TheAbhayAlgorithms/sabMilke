"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { Upload, Plus, FileText, CheckCircle2, AlertTriangle, X, Eye } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface SkuItem {
  id: string;
  variantName: string;
  packSize: number | string;
  unit: string;
  mrpPaise: number;
  product: {
    id: string;
    brand: string;
    name: string;
    isFood: boolean;
    fssaiNumber: string | null;
    hsnCode: string;
    gstRate: number | string;
    category: {
      name: string;
    };
  };
  quotesCount: number;
}

interface CatalogueManagerClientProps {
  categories: Category[];
  initialSkus: SkuItem[];
}

export function CatalogueManagerClient({ categories, initialSkus }: CatalogueManagerClientProps) {
  const [skus, setSkus] = useState<SkuItem[]>(initialSkus);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalRows: number;
    importedCount: number;
    validRowsCount: number;
    errors: { row: number; field?: string; message: string; raw: string }[];
  } | null>(null);

  // New product form state
  const [formData, setFormData] = useState({
    categoryId: categories[0]?.id || "",
    brand: "",
    name: "",
    isFood: true,
    fssaiNumber: "",
    hsnCode: "",
    gstRate: 5,
    variantName: "",
    packSize: 1,
    unit: "kg",
    mrpPaise: 10000,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sampleCsv = `category,brand,name,isFood,fssaiNumber,hsnCode,gstRate,variantName,packSize,unit,mrpPaise
Rice & Grains,India Gate,Classic Basmati Rice,true,10012011000123,1006,0,5 kg Bag,5,kg,65000
Atta & Flours,Aashirvaad,Shudh Chakki Whole Wheat Atta,true,10012011000126,1101,0,10 kg Bag,10,kg,49000
Household Cleaning,Lizol,Disinfectant Surface Cleaner,false,,3808,18,5 L Can,5,L,89000`;

  const handleImportCsv = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/catalogue/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportResult(data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "CSV import error");
    } finally {
      setImporting(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/catalogue/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          packSize: Number(formData.packSize),
          gstRate: Number(formData.gstRate),
          mrpPaise: Number(formData.mrpPaise),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");
      setShowAddModal(false);
      window.location.reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Platform Catalogue Manager</h1>
          <p className="text-xs text-gray-500">
            {skus.length} SKUs across {categories.length} categories. FSSAI enforced on all food lines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50"
          >
            <Upload className="h-4 w-4 text-brand-600" />
            Bulk CSV Import
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add SKU
          </button>
        </div>
      </div>

      {/* Catalogue Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-700 uppercase">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Brand & Product</th>
              <th className="px-4 py-3">Variant / Pack</th>
              <th className="px-4 py-3">FSSAI Status</th>
              <th className="px-4 py-3">MRP (paise)</th>
              <th className="px-4 py-3">Quotes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {skus.map((sku) => (
              <tr key={sku.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {sku.product.category.name}
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-900">{sku.product.brand}</div>
                  <div className="text-[11px] text-gray-500">{sku.product.name}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-gray-800">
                    {sku.variantName}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {sku.product.isFood ? (
                    sku.product.fssaiNumber ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        {sku.product.fssaiNumber}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        <AlertTriangle className="h-3 w-3" />
                        MISSING FSSAI
                      </span>
                    )
                  ) : (
                    <span className="text-[11px] text-gray-400">Non-Food (N/A)</span>
                  )}
                </td>
                <td className="px-4 py-3 font-bold text-gray-900">
                  {formatINR(sku.mrpPaise)}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                    {sku.quotesCount} Active
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/quotes?skuId=${sku.id}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Compare Quotes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-600" />
                Bulk Catalogue CSV Import
              </h2>
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700">Paste CSV Contents</label>
                <button
                  type="button"
                  onClick={() => setCsvText(sampleCsv)}
                  className="text-[11px] font-semibold text-brand-700 hover:underline"
                >
                  Load Sample CSV
                </button>
              </div>
              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV rows here..."
                className="w-full rounded-xl border border-gray-300 p-3 font-mono text-xs text-gray-800 focus:border-brand-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Required columns: category, brand, name, isFood, fssaiNumber, hsnCode, gstRate, variantName, packSize, unit, mrpPaise
              </p>
            </div>

            {/* Import Validation Report */}
            {importResult && (
              <div className="mb-4 rounded-xl border p-4 text-xs font-medium bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900">
                    Import Result: {importResult.importedCount} new SKUs imported ({importResult.validRowsCount} valid / {importResult.totalRows} total)
                  </span>
                  {importResult.errors.length === 0 ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> 100% Valid
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> {importResult.errors.length} Error(s)
                    </span>
                  )}
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t border-gray-200 pt-2 text-red-700">
                    <span className="font-bold block text-gray-800">Validation Errors:</span>
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} className="rounded bg-red-50 p-2 text-[11px] border border-red-200">
                        <strong>Line {err.row}:</strong> {err.message}
                        <div className="font-mono text-gray-500 text-[10px] truncate">{err.raw}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                type="button"
                disabled={importing || !csvText.trim()}
                onClick={handleImportCsv}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50"
              >
                {importing ? "Validating & Importing..." : "Validate & Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Single SKU Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <form
            onSubmit={handleCreateProduct}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-3 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Add New Catalogue SKU</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-lg bg-red-50 p-2.5 text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <div>
              <label className="block font-bold text-gray-700 mb-1">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full rounded-xl border border-gray-300 p-2 text-xs font-semibold"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Brand Name</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g. Tata Sampann"
                  className="w-full rounded-xl border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Toor Dal Unpolished"
                  className="w-full rounded-xl border border-gray-300 p-2"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-4 py-1">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={formData.isFood}
                  onChange={(e) => setFormData({ ...formData, isFood: e.target.checked })}
                  className="rounded border-gray-300 h-4 w-4 text-brand-600"
                />
                Food Product (FSSAI mandatory)
              </label>
            </div>

            {formData.isFood && (
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  FSSAI 14-Digit License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={formData.fssaiNumber}
                  onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value.replace(/\D/g, "") })}
                  placeholder="e.g. 10012011000123"
                  className="w-full rounded-xl border border-gray-300 p-2 font-mono"
                  required={formData.isFood}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">HSN Code</label>
                <input
                  type="text"
                  value={formData.hsnCode}
                  onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                  placeholder="e.g. 0713"
                  className="w-full rounded-xl border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">GST Rate (%)</label>
                <select
                  value={formData.gstRate}
                  onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-300 p-2"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Variant Name</label>
                <input
                  type="text"
                  value={formData.variantName}
                  onChange={(e) => setFormData({ ...formData, variantName: e.target.value })}
                  placeholder="e.g. 5 kg Bag"
                  className="w-full rounded-xl border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Pack Size</label>
                <input
                  type="number"
                  step="any"
                  value={formData.packSize}
                  onChange={(e) => setFormData({ ...formData, packSize: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 p-2"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="l">L</option>
                  <option value="ml">ml</option>
                  <option value="piece">piece</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                MRP in Paise (Rule 1: Integer paise)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={formData.mrpPaise}
                  onChange={(e) => setFormData({ ...formData, mrpPaise: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-300 p-2 font-mono font-bold"
                  required
                />
                <span className="text-xs font-bold text-brand-700 whitespace-nowrap">
                  = {formatINR(formData.mrpPaise || 0)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-brand-600 px-4 py-2 font-bold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Create Product & SKU"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
