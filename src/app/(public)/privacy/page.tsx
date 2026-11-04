import React from "react";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Privacy Notice & DPDP Compliance</h1>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 text-xs text-amber-900">
        <strong>Statutory Notice:</strong> Data Protection and Privacy policy under Digital Personal Data Protection (DPDP) Act. (TODO_LEGAL)
      </div>
      <div className="prose prose-sm text-gray-700 space-y-4 text-xs leading-relaxed">
        <p>
          TODO_LEGAL: SocietyBuy collects minimal personal data: resident name, phone number, and housing flat identifier only. No credit card or sensitive biometric data is stored on our servers.
        </p>
        <p>
          TODO_LEGAL: Consent is explicitly collected with itemized purposes, no pre-ticked checkboxes, and users may exercise their right to withdraw consent or delete their account at any time.
        </p>
      </div>
    </div>
  );
}
