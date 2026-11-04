"use client";

import React from "react";
import { formatINR } from "@/lib/money";
import { ComputedInvoice } from "@/server/domain/taxInvoice";
import { Printer, ArrowLeft, ShieldCheck, Building, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface ResidentInvoiceClientProps {
  order: {
    id: string;
    pickupCode: string;
    status: string;
    createdAt: string | Date;
    societyName: string;
    flatNumber: string;
    tower: string | null;
    residentName: string;
    residentPhone: string;
  };
  invoice: ComputedInvoice;
}

export function ResidentInvoiceClient({ order, invoice }: ResidentInvoiceClientProps) {
  return (
    <div className="space-y-6">
      {/* Controls (Hidden on print) */}
      <div className="print:hidden flex items-center justify-between">
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Order Pickup Pass
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-black"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
      </div>

      {/* Invoice Document Layout */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-6 text-gray-800">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-gray-200 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-brand-700">SocietyBuy</span>
              <span className="text-[10px] font-bold uppercase bg-brand-50 text-brand-800 px-2 py-0.5 rounded border border-brand-200">
                {invoice.isCreditNote ? "Credit Note" : "Tax Invoice"}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1 max-w-sm font-semibold">
              {invoice.legalEntity.companyName}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              GSTIN: <span className="font-mono text-gray-700">{invoice.legalEntity.gstin}</span>
            </p>
            <p className="text-[11px] text-gray-500">
              CIN: <span className="font-mono text-gray-700">{invoice.legalEntity.cin}</span> • PAN:{" "}
              <span className="font-mono text-gray-700">{invoice.legalEntity.pan}</span>
            </p>
            <p className="text-[11px] text-gray-500">
              FSSAI Lic: <span className="font-mono text-gray-700">{invoice.legalEntity.fssaiLicense}</span>
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="text-xs uppercase font-bold text-gray-400 block tracking-wider">
              {invoice.isCreditNote ? "Credit Note Ref" : "Invoice Reference"}
            </span>
            <div className="font-mono text-sm font-bold text-gray-900">{invoice.invoiceNumber}</div>
            <div className="text-xs text-gray-500">
              Date: {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="text-xs text-gray-500">
              Order PIN: <strong className="font-mono text-gray-900">{order.pickupCode}</strong>
            </div>
          </div>
        </div>

        {/* Billed To / Society Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-gray-50 border border-gray-100 p-4 text-xs">
          <div>
            <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-1">
              Billed To (Resident)
            </span>
            <div className="font-bold text-sm text-gray-900">{order.residentName}</div>
            <div className="text-gray-600 mt-0.5">
              {order.tower ? `${order.tower} - ` : ""}Flat {order.flatNumber}
            </div>
            <div className="text-gray-600">Phone: {order.residentPhone}</div>
          </div>

          <div>
            <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-1">
              Society Delivery Drop Point
            </span>
            <div className="font-bold text-sm text-gray-900">{order.societyName}</div>
            <div className="text-gray-600 mt-0.5">Pooled Group Order Delivery</div>
            <div className="text-gray-500 text-[11px] mt-1">Place of Supply: Karnataka (29)</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[11px] font-bold text-gray-700 uppercase border-b border-gray-200">
              <tr>
                <th className="px-3.5 py-3">#</th>
                <th className="px-3.5 py-3">Description of Goods</th>
                <th className="px-3.5 py-3">HSN Code</th>
                <th className="px-3.5 py-3 text-center">Billed Qty</th>
                <th className="px-3.5 py-3 text-right">Taxable Val</th>
                <th className="px-3.5 py-3 text-right">CGST</th>
                <th className="px-3.5 py-3 text-right">SGST</th>
                <th className="px-3.5 py-3 text-right">Gross Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {invoice.lines.map((item, idx) => (
                <tr key={item.skuId}>
                  <td className="px-3.5 py-2.5 text-gray-400">{idx + 1}</td>
                  <td className="px-3.5 py-2.5">
                    <div className="font-bold text-gray-900">{item.productName}</div>
                    <div className="text-[11px] text-gray-400">{item.variantName}</div>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-gray-500">{item.hsnCode}</td>
                  <td className="px-3.5 py-2.5 text-center font-bold text-gray-900">{item.billedQuantity}</td>
                  <td className="px-3.5 py-2.5 text-right font-semibold text-gray-800">
                    {formatINR(item.taxableAmountPaise)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-gray-600">
                    {formatINR(item.cgstPaise)}
                    <span className="text-[10px] text-gray-400 block">
                      ({(item.gstRatePercent / 2).toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-gray-600">
                    {formatINR(item.sgstPaise)}
                    <span className="text-[10px] text-gray-400 block">
                      ({(item.gstRatePercent / 2).toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-bold text-gray-900">
                    {formatINR(item.grossAmountPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary Totals */}
        <div className="flex justify-end pt-2">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Total Taxable Amount</span>
              <span className="font-bold text-gray-900">{formatINR(invoice.totalTaxablePaise)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Total CGST</span>
              <span className="font-medium text-gray-900">{formatINR(invoice.totalCgstPaise)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Total SGST</span>
              <span className="font-medium text-gray-900">{formatINR(invoice.totalSgstPaise)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
              <span className="font-bold text-gray-900">Total Invoice Amount (INR)</span>
              <span className="font-bold text-brand-700">{formatINR(invoice.totalAmountPaise)}</span>
            </div>
          </div>
        </div>

        {/* Statutory Disclosures */}
        <div className="border-t border-gray-200 pt-6 text-[10px] text-gray-400 space-y-1.5 leading-relaxed">
          <p>
            <strong>Registered Office:</strong> {invoice.legalEntity.registeredAddress}
          </p>
          <p>
            <strong>Grievance Officer:</strong> {invoice.legalEntity.grievanceOfficer} (Email: {invoice.legalEntity.grievanceEmail})
          </p>
          <p className="italic pt-1 text-gray-400">
            * This is a computer-generated tax invoice issued by SocietyBuy. Placeholders marked TODO_LEGAL represent statutory filings pending regulatory clearance.
          </p>
        </div>
      </div>
    </div>
  );
}
