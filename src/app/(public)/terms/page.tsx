import React from "react";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Terms of Service</h1>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 text-xs text-amber-900">
        <strong>Statutory Notice:</strong> All terms contained on this page are subject to statutory verification. (TODO_LEGAL)
      </div>
      <div className="prose prose-sm text-gray-700 space-y-4 text-xs leading-relaxed">
        <p>
          TODO_LEGAL: These Terms of Service constitute a legally binding agreement between SocietyBuy Technologies Pvt Ltd and registered residents, volunteer captains, and participating housing societies.
        </p>
        <p>
          TODO_LEGAL: Society pooling terms, minimum order thresholds, guarantee pricing, lock deadlines, delivery drop protocols, and wallet redemption regulations are governed by Indian consumer protection laws.
        </p>
      </div>
    </div>
  );
}
