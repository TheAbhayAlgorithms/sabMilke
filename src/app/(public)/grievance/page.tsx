import React from "react";

export default function GrievanceOfficerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Grievance Redressal Officer</h1>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-3">Statutory Contact Details</h2>
        <div className="space-y-2 text-xs text-gray-700">
          <div>
            <span className="font-semibold">Designated Officer:</span> Shri R. K. Nair (TODO_LEGAL)
          </div>
          <div>
            <span className="font-semibold">Designation:</span> Head of Consumer Trust & Grievance (TODO_LEGAL)
          </div>
          <div>
            <span className="font-semibold">Email:</span> grievance@societybuy.in (TODO_LEGAL)
          </div>
          <div>
            <span className="font-semibold">Office Address:</span> SocietyBuy Technologies Pvt Ltd, Sarjapur Outer Ring Road, Bengaluru, Karnataka - 560103 (TODO_LEGAL)
          </div>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-600 space-y-1">
          <p>
            <strong>Acknowledgement Time:</strong> Within 48 hours of ticket receipt.
          </p>
          <p>
            <strong>Resolution Redressal Target:</strong> Maximum 30 days from acknowledgement.
          </p>
        </div>
      </div>
    </div>
  );
}

