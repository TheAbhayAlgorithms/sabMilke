"use client";

import React from "react";
import { useLanguage } from "@/i18n";

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm text-xs font-semibold">
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`px-2.5 py-1 rounded-md transition-colors ${
          language === "en"
            ? "bg-brand-600 text-white shadow-xs"
            : "text-gray-600 hover:text-gray-900"
        }`}
        aria-label="Switch to English"
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLanguage("hi")}
        className={`px-2.5 py-1 rounded-md transition-colors ${
          language === "hi"
            ? "bg-brand-600 text-white shadow-xs"
            : "text-gray-600 hover:text-gray-900"
        }`}
        aria-label="Switch to Hindi"
      >
        हिंदी
      </button>
    </div>
  );
}

