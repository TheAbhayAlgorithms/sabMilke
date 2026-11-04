import React from "react";
import Link from "next/link";
import { SearchX, Home, ShoppingBag } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-500 border border-gray-200">
          <SearchX className="h-7 w-7 text-gray-400" />
        </div>

        <h1 className="text-xl font-black text-gray-900 tracking-tight">
          Page Not Found
        </h1>
        <p className="mt-1 text-xs font-semibold text-gray-500">
          पृष्ठ नहीं मिला (404)
        </p>

        <p className="mt-3 text-xs leading-relaxed text-gray-600">
          The society pool, order details, or page you are looking for does not exist or may have been moved.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/catalogue"
            className="w-full sm:w-auto min-h-[44px] min-w-[140px] inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-brand-700 active:scale-[0.98] transition-all"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Catalogue (कैटलॉग)</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto min-h-[44px] min-w-[140px] inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            <Home className="h-4 w-4 text-gray-500" />
            <span>Home (होम)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

