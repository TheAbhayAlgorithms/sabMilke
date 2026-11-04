"use client";

import React from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  Building2,
  QrCode,
  Sparkles,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface OrderDetailClientProps {
  order: {
    id: string;
    pickupCode: string;
    qrCodeToken: string;
    status: string;
    totalGuaranteedPaise: number;
    totalFinalPaise: number | null;
    totalRefundPaise: number;
    createdAt: string;
    cycle: {
      name: string;
      status: string;
      locksAt: string;
      deliveryTargetDate: string;
      society: {
        name: string;
        dropPoints: { name: string; instructions: string | null }[];
      };
    };
    flat: {
      flatNumber: string;
      tower: string | null;
    };
    items: {
      id: string;
      quantity: number;
      guaranteedPricePaise: number;
      finalPricePaise: number | null;
      refundDeltaPaise: number;
      sku: {
        variantName: string;
        product: {
          brand: string;
          name: string;
        };
      };
    }[];
    payments: {
      id: string;
      provider: string;
      amountPaise: number;
      status: string;
      paymentMethod: string | null;
    }[];
  };
}

export function OrderDetailClient({ order }: OrderDetailClientProps) {
  const dropPoint = order.cycle.society.dropPoints[0];

  // Timeline steps
  const steps = [
    {
      key: "CONFIRMED",
      title: "Order Placed & Paid",
      description: "Guaranteed join price secured. Pooled with society volume.",
      done: ["CONFIRMED", "ALLOCATED", "RECEIVED_AT_DROP", "HANDED_OVER"].includes(order.status),
      active: order.status === "CONFIRMED",
    },
    {
      key: "ALLOCATED",
      title: "Wholesale PO Sent",
      description: "Cycle locked. Final discounted wholesale prices locked in.",
      done: ["ALLOCATED", "RECEIVED_AT_DROP", "HANDED_OVER"].includes(order.status),
      active: order.status === "ALLOCATED",
    },
    {
      key: "RECEIVED_AT_DROP",
      title: "Arrived at Drop Point",
      description: "Truck unloaded. Captain checked in items at Clubhouse.",
      done: ["RECEIVED_AT_DROP", "HANDED_OVER"].includes(order.status),
      active: order.status === "RECEIVED_AT_DROP",
    },
    {
      key: "HANDED_OVER",
      title: "Collected by Resident",
      description: "QR scanned and items collected.",
      done: order.status === "HANDED_OVER",
      active: order.status === "HANDED_OVER",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="mb-2">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
        </Link>
      </div>

      {/* QR Pickup Pass Card */}
      <div className="rounded-3xl border-2 border-brand-500 bg-white p-6 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 bg-brand-600 text-white text-[10px] font-extrabold uppercase py-1 tracking-wider">
          Official Society Pickup Pass
        </div>

        <div className="pt-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
            Pickup PIN Code
          </span>
          <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-gray-900 my-1">
            {order.pickupCode.slice(0, 3)} {order.pickupCode.slice(3)}
          </div>

          <div className="mx-auto my-4 flex h-40 w-40 items-center justify-center rounded-2xl bg-gray-50 border-2 border-gray-900 p-2">
            {/* Visual SVG QR representation */}
            <div className="flex flex-col items-center justify-center">
              <QrCode className="h-28 w-28 text-gray-900" />
              <span className="text-[9px] font-mono font-bold text-gray-500 truncate max-w-[130px]">
                {order.qrCodeToken.slice(0, 16)}...
              </span>
            </div>
          </div>

          <div className="max-w-sm mx-auto text-xs text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <span className="font-bold text-gray-900 block mb-0.5">
              {order.flat.tower ? `${order.flat.tower} - ` : ""}Flat {order.flat.flatNumber}
            </span>
            <p className="text-[11px] text-gray-500">
              Show this QR code or 6-digit PIN to the Captain at the <strong>{dropPoint?.name || "Drop Point"}</strong> to collect your staples.
            </p>
          </div>
        </div>
      </div>

      {/* 4-Step Status Timeline */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Order Progress Timeline</h2>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={step.key} className="flex items-start gap-3.5">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    step.done
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}
                >
                  {step.done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-8 w-0.5 ${
                      step.done ? "bg-brand-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>

              <div className="pt-1">
                <span className={`text-xs font-bold block ${step.done ? "text-gray-900" : "text-gray-400"}`}>
                  {step.title}
                </span>
                <span className="text-[11px] text-gray-500 block leading-normal">
                  {step.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Itemized Order Breakdown */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Ordered Staples ({order.items.length})</h2>
          <span className="text-xs text-gray-500">{order.cycle.name}</span>
        </div>

        <div className="divide-y divide-gray-100 text-xs">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-gray-900 block">
                  {item.sku.product.brand} - {item.sku.product.name}
                </span>
                <span className="text-[11px] text-gray-500">
                  {item.quantity} × {item.sku.variantName} • {formatINR(item.guaranteedPricePaise)}/unit
                </span>
                {item.refundDeltaPaise > 0 && (
                  <span className="block text-[10px] font-bold text-emerald-700">
                    Tier discount price drop: {formatINR(item.finalPricePaise!)} (Saved {formatINR(item.refundDeltaPaise * item.quantity)})
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="font-black text-gray-900 block">
                  {formatINR((item.finalPricePaise ?? item.guaranteedPricePaise) * item.quantity)}
                </span>
                {item.finalPricePaise && item.finalPricePaise < item.guaranteedPricePaise && (
                  <span className="text-[10px] text-gray-400 line-through">
                    {formatINR(item.guaranteedPricePaise * item.quantity)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals & Refunds summary */}
        <div className="pt-3 border-t border-gray-100 space-y-1 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Guaranteed Join Total</span>
            <span>{formatINR(order.totalGuaranteedPaise)}</span>
          </div>

          {order.totalRefundPaise > 0 && (
            <div className="flex justify-between font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                Price Drop Savings Credited to Wallet
              </span>
              <span>+{formatINR(order.totalRefundPaise)}</span>
            </div>
          )}

          <div className="flex justify-between font-black text-sm text-gray-900 pt-2 border-t border-gray-200">
            <span>Final Total Cost</span>
            <span>{formatINR(order.totalFinalPaise ?? order.totalGuaranteedPaise)}</span>
          </div>

          <div className="pt-3">
            <Link
              href={`/orders/${order.id}/invoice`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 text-brand-600" />
              Download GST Tax Invoice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

