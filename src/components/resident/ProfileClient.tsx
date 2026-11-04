"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Phone,
  FileText,
} from "lucide-react";
import { CONSENT_PURPOSES } from "@/server/services/consentService";

interface ProfileClientProps {
  user: {
    id: string;
    name: string;
    phone: string;
    membership?: {
      societyName: string;
      flatNumber: string;
      tower: string | null;
      role: string;
    } | null;
  };
  activeConsentPurposes: string[];
}

export function ProfileClient({ user, activeConsentPurposes }: ProfileClientProps) {
  const router = useRouter();

  // Rule 8: No pre-ticked consent boxes!
  // If activeConsentPurposes has entries from prior save, use them, otherwise empty!
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>(activeConsentPurposes || []);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentMsg, setConsentMsg] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleTogglePurpose = (purposeId: string) => {
    setSelectedPurposes((prev) =>
      prev.includes(purposeId) ? prev.filter((p) => p !== purposeId) : [...prev, purposeId]
    );
  };

  const handleSaveConsent = async () => {
    setConsentSaving(true);
    setConsentMsg(null);

    try {
      const res = await fetch("/api/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purposes: selectedPurposes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record consent");

      setConsentMsg("Consent preferences recorded with timestamp and version v1.0.");
    } catch (err: unknown) {
      setConsentMsg(err instanceof Error ? err.message : "Error saving consent");
    } finally {
      setConsentSaving(false);
    }
  };

  const handleRevokeAllConsent = async () => {
    setConsentSaving(true);
    setConsentMsg(null);

    try {
      const res = await fetch("/api/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke consent");

      setSelectedPurposes([]);
      setConsentMsg("All consents revoked in one tap. Your data will not be processed for optional purposes.");
    } catch (err: unknown) {
      setConsentMsg(err instanceof Error ? err.message : "Error revoking consent");
    } finally {
      setConsentSaving(false);
    }
  };

  const handleExportData = () => {
    window.location.href = "/api/user/data-export";
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);

    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete account");

      router.push("/login?deleted=true");
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Account deletion failed");
      setDeleteLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
      </div>

      {/* User Information Card */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 font-bold text-lg">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{user.name}</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
              <Phone className="h-3 w-3 text-gray-400" />
              <span>{user.phone}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3.5">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Housing Society</span>
            <span className="font-bold text-gray-900 text-sm">
              {user.membership?.societyName || "Not joined to any society"}
            </span>
            <span className="block text-[11px] text-gray-500 mt-1">
              Flat: {user.membership?.flatNumber ? `${user.membership.tower ? `${user.membership.tower} - ` : ""}Flat ${user.membership.flatNumber}` : "None"}
            </span>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3.5">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Account Role</span>
            <span className="font-bold text-brand-700 text-sm">
              {user.membership?.role || "RESIDENT"}
            </span>
            <span className="block text-[11px] text-gray-500 mt-1">
              Member ID: {user.id.slice(0, 10)}...
            </span>
          </div>
        </div>
      </div>

      {/* Consent Management (Rule 8: Plain Language, No Pre-ticked Boxes, 1-Tap Revocation) */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <h2 className="text-base font-bold text-gray-900">Privacy & Consent Preferences (DPDP Act)</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            We collect minimal data (Name, Phone, and Flat number only). Select only the purposes you consent to. No boxes are pre-ticked.
          </p>
        </div>

        {consentMsg && (
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-3.5 text-xs text-brand-800 font-semibold">
            {consentMsg}
          </div>
        )}

        <div className="space-y-3 pt-2">
          {CONSENT_PURPOSES.map((purpose) => {
            const isChecked = selectedPurposes.includes(purpose.id);

            return (
              <label
                key={purpose.id}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                  isChecked
                    ? "border-brand-500 bg-brand-50/50 shadow-2xs"
                    : "border-gray-200 bg-white hover:bg-gray-50/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleTogglePurpose(purpose.id)}
                  className="mt-0.5 h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="font-bold text-gray-900 block">{purpose.labelEn}</span>
                  <span className="text-[11px] text-gray-500 block leading-normal mt-0.5">
                    {purpose.descriptionEn}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-1 font-hindi">
                    {purpose.descriptionHi}
                  </span>
                </div>
              </label>
            );
          })}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
          <button
            type="button"
            onClick={handleSaveConsent}
            disabled={consentSaving}
            className="w-full sm:w-auto rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-brand-700 disabled:opacity-50"
          >
            {consentSaving ? "Recording..." : "Save Consent Preferences"}
          </button>

          <button
            type="button"
            onClick={handleRevokeAllConsent}
            disabled={consentSaving}
            className="w-full sm:w-auto rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Revoke All in One Tap
          </button>
        </div>
      </div>

      {/* Compliance & Data Rights: Export & Delete Account */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Your Data Protection Rights</h2>
          <p className="text-xs text-gray-500 mt-1">
            Under India&apos;s Digital Personal Data Protection Act (DPDP), you have the right to export your data or delete your account at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-xs text-gray-900 mb-1">
                <Download className="h-4 w-4 text-brand-600" />
                <span>Export My Data</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Download a complete, machine-readable JSON copy of your orders, payments, wallet credits, and consents.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="w-full rounded-xl bg-gray-900 py-2 text-xs font-bold text-white hover:bg-black transition-colors"
            >
              Download JSON Export
            </button>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-xs text-red-700 mb-1">
                <Trash2 className="h-4 w-4 text-red-600" />
                <span>Delete My Account</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Permanently soft-delete your resident profile, revoke all consents, and anonymize your contact details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="w-full rounded-xl bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* Legal Disclaimer marked TODO_LEGAL per Rule 9 */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3.5 text-[11px] text-gray-400 space-y-1">
          <p className="font-semibold text-gray-500 flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            <span>TODO_LEGAL: Terms of Service & Grievance Redressal</span>
          </p>
          <p>
            Grievance Officer: <code>TODO_LEGAL (grievance@societybuy.in)</code>. SocietyBuy adheres to the Indian Digital Personal Data Protection Act (DPDP) and Consumer Protection (E-Commerce) Rules.
          </p>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl space-y-4 text-xs animate-fadeIn">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-gray-900">Confirm Account Deletion?</h3>
              <p className="text-xs text-gray-500 mt-1">
                This will soft-delete your resident account, revoke all consents, and anonymize your phone number. Active orders will still be delivered.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 font-bold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteAccount}
                className="flex-1 rounded-xl bg-red-600 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
