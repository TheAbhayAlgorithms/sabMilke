"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LifeBuoy,
  Camera,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Plus,
} from "lucide-react";

interface RaiseTicketClientProps {
  orderId: string;
  orderNumber?: string;
}

export function RaiseTicketClient({ orderId, orderNumber }: RaiseTicketClientProps) {
  const router = useRouter();
  const [category, setCategory] = useState<
    "DAMAGED_PACK" | "MISSING_ITEM" | "QUALITY_ISSUE" | "OTHER"
  >("DAMAGED_PACK");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [customPhotoInput, setCustomPhotoInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const samplePhotos = [
    { label: "Broken Seal", url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500" },
    { label: "Damaged Box", url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500" },
  ];

  function addPhoto(url: string) {
    if (!url.trim()) return;
    if (!photoUrls.includes(url.trim())) {
      setPhotoUrls([...photoUrls, url.trim()]);
    }
    setCustomPhotoInput("");
  }

  function removePhoto(index: number) {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (!subject.trim()) {
      setErrorMessage("Please enter a short subject for the issue.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Please describe the issue in detail.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          category,
          subject: subject.trim(),
          description: description.trim(),
          photoUrls,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit ticket.");
      }

      router.push(`/tickets/${data.ticket.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <Link
        href={`/orders/${orderId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Order #{orderNumber || orderId.slice(-6)}
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Raise an Issue</h1>
            <p className="text-xs text-gray-500">
              Order #{orderNumber || orderId.slice(-6)} • 48-Hour SLA Guarantee
            </p>
          </div>
        </div>

        {/* SLA Notice Box */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-5 text-xs text-amber-900 flex items-start gap-2.5">
          <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Grievance SLA Commitment:</span>
            <p className="text-amber-800 mt-0.5">
              Issues must be raised within 24 hours of goods collection. Our Grievance Officer will formally acknowledge within 48 hours and resolve with replacement or wallet refund.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-4 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Issue Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-semibold text-gray-800 focus:border-brand-500 focus:outline-hidden"
            >
              <option value="DAMAGED_PACK">📦 Damaged Packaging / Seal Broken</option>
              <option value="MISSING_ITEM">🔍 Missing Item from Bundle</option>
              <option value="QUALITY_ISSUE">⚠️ Quality or Freshness Issue</option>
              <option value="OTHER">💬 Other Query</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Broken oil can seal / 1kg Salt missing"
              className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details of the item, condition upon pickup, batch number if visible..."
              className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Photo Attachments */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Attach Photos (Recommended for quick refund approval)
            </label>

            {photoUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {photoUrls.map((url, idx) => (
                  <div key={idx} className="relative rounded-lg border border-gray-200 overflow-hidden group">
                    <img
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      className="h-28 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 rounded-md bg-black/60 p-1 text-white hover:bg-black/80"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="url"
                value={customPhotoInput}
                onChange={(e) => setCustomPhotoInput(e.target.value)}
                placeholder="Paste photo URL (https://...)"
                className="flex-1 rounded-xl border border-gray-300 p-2 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => addPhoto(customPhotoInput)}
                className="rounded-xl bg-gray-100 hover:bg-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors"
              >
                Add URL
              </button>
            </div>

            {/* Quick sample photo selector for testing */}
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
              <span>Quick demo photos:</span>
              {samplePhotos.map((sp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => addPhoto(sp.url)}
                  className="rounded bg-gray-100 px-2 py-0.5 font-medium hover:bg-gray-200 text-brand-700"
                >
                  +{sp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              "Submitting Issue..."
            ) : (
              <>
                <LifeBuoy className="h-4 w-4" />
                Submit Issue to Grievance Officer
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

