"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n";
import { Phone, Shield, ArrowRight, CheckCircle2 } from "lucide-react";

const DEMO_ROLES = [
  { role: "Resident", phone: "9876543211", name: "Aarav Sharma (Flat A-101)", color: "border-blue-200 bg-blue-50/50" },
  { role: "Society Captain", phone: "9876543210", name: "Vikram Sharma (Flat A-402)", color: "border-emerald-200 bg-emerald-50/50" },
  { role: "Society Admin (RWA)", phone: "9876543241", name: "Ramesh Gupta (Flat B-201)", color: "border-amber-200 bg-amber-50/50" },
  { role: "Wholesale Supplier", phone: "9876543301", name: "Apex Agro Wholesale", color: "border-indigo-200 bg-indigo-50/50" },
  { role: "Platform Admin", phone: "9876543200", name: "Ananya Roy (Console)", color: "border-purple-200 bg-purple-50/50" },
];

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (targetPhone = phone) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: targetPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      setPhone(targetPhone);
      setStep("OTP");
      setOtp("123456"); // Pre-fill test OTP for immediate demo speed
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      const role = data.session?.activeRole;
      if (role === "PLATFORM_ADMIN") router.push("/admin");
      else if (role === "SUPPLIER") router.push("/supplier");
      else if (role === "CAPTAIN") router.push("/captain");
      else if (role === "SOCIETY_ADMIN") router.push("/society-admin");
      else router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoPhone: string) => {
    setPhone(demoPhone);
    handleSendOtp(demoPhone);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <Phone className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            {t("auth.login_title")}
          </h1>
          <p className="mt-1 text-xs text-gray-500">{t("auth.login_sub")}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {step === "PHONE" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendOtp();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-bold text-gray-500">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-gray-300 pl-12 pr-4 py-2.5 text-sm font-semibold tracking-wide text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Sending..." : t("auth.send_otp")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyOtp();
            }}
            className="space-y-4"
          >
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t("auth.enter_otp")}
                </label>
                <button
                  type="button"
                  onClick={() => setStep("PHONE")}
                  className="text-[11px] text-brand-600 font-semibold hover:underline"
                >
                  Change Number
                </button>
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full text-center tracking-widest text-lg font-bold rounded-xl border border-gray-300 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                required
              />
              <p className="mt-1 text-[11px] text-emerald-700 font-medium text-center">
                ✓ {t("auth.test_otp_hint")}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Verifying..." : t("auth.verify_otp")}
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Demo Fast Login Selector */}
        <div className="mt-8 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-gray-700">
            <Shield className="h-4 w-4 text-brand-600" />
            <span>Seed Users Quick Login</span>
          </div>
          <div className="space-y-2">
            {DEMO_ROLES.map((d) => (
              <button
                key={d.phone}
                type="button"
                onClick={() => handleQuickLogin(d.phone)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between hover:shadow-xs ${d.color}`}
              >
                <div>
                  <div className="font-bold text-gray-900">{d.role}</div>
                  <div className="text-[11px] text-gray-500">{d.name} • {d.phone}</div>
                </div>
                <span className="text-[11px] font-bold text-brand-700 bg-white px-2 py-1 rounded-md border border-gray-200">
                  Select →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

