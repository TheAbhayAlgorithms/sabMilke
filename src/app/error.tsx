"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Masked/safe error logging for client errors
    console.error("[APP_ERROR_BOUNDARY]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="text-xl font-black text-gray-900 tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-1 text-xs font-semibold text-gray-500">
          कुछ गलत हो गया
        </p>

        <p className="mt-3 text-xs leading-relaxed text-gray-600">
          We encountered an unexpected error while loading this page. Your society grocery data is safe. Please try refreshing or return to the home screen.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-gray-400 bg-gray-50 py-1 px-2 rounded-lg border border-gray-100">
            Reference ID: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto min-h-[44px] min-w-[130px] inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-brand-700 active:scale-[0.98] transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again (पुनः प्रयास)</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto min-h-[44px] min-w-[130px] inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            <Home className="h-4 w-4 text-gray-500" />
            <span>Go to Home (होम)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

