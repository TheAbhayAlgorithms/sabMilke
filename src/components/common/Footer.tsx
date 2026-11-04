"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/i18n";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="w-full border-t border-gray-200 bg-white py-8 text-xs text-gray-500">
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">{t("app.name")}</h4>
            <p className="text-gray-600 mb-2">{t("app.tagline")}</p>
            <p className="text-[11px] text-gray-400">
              Entity Name: SocietyBuy Technologies Pvt Ltd (TODO_LEGAL)
              <br />
              Registered Office: Bangalore, Karnataka, India (TODO_LEGAL)
              <br />
              Contact: support@societybuy.in (TODO_LEGAL)
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Legal & Statutory</h4>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <Link href="/terms" className="hover:text-brand-600 underline">
                  {t("legal.terms")} (TODO_LEGAL)
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand-600 underline">
                  {t("legal.privacy")} (TODO_LEGAL)
                </Link>
              </li>
              <li>
                <Link href="/grievance" className="hover:text-brand-600 underline">
                  {t("legal.grievance")} (TODO_LEGAL)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Grievance Redressal</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Grievance Officer: Shri R. K. Nair (TODO_LEGAL)
              <br />
              Email: grievance@societybuy.in (TODO_LEGAL)
              <br />
              Statutory Acknowledgement: Within 48 hours
              <br />
              Resolution SLA: Maximum 30 days
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>© {new Date().getFullYear()} SocietyBuy. All rights reserved.</p>
          <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            {t("legal.disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
