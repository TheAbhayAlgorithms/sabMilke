"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Home, ArrowRight, CheckCircle2 } from "lucide-react";

interface FlatOption {
  id: string;
  flatNumber: string;
  tower: string | null;
}

interface SocietyData {
  id: string;
  name: string;
  joinCode: string;
  addressLine: string;
  city: string;
  pincode: string;
  flats: FlatOption[];
}

interface JoinSocietyClientProps {
  initialCode?: string;
  initialUserName?: string;
}

export function JoinSocietyClient({ initialCode = "", initialUserName = "" }: JoinSocietyClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code") || initialCode;

  const [joinCode, setJoinCode] = useState(codeParam.toUpperCase());
  const [userName, setUserName] = useState(initialUserName);
  const [selectedFlatId, setSelectedFlatId] = useState("");
  const [society, setSociety] = useState<SocietyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch society if code present in URL
  useEffect(() => {
    if (codeParam) {
      handleLookup(codeParam);
    }
  }, [codeParam]);

  const handleLookup = async (codeToLookup: string) => {
    if (!codeToLookup.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/society/details?code=${encodeURIComponent(codeToLookup.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Society not found");

      setSociety(data.society);
      if (data.society.flats && data.society.flats.length > 0) {
        setSelectedFlatId(data.society.flats[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to lookup society");
      setSociety(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!society || !selectedFlatId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/society/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          societyId: society.id,
          flatId: selectedFlatId,
          name: userName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join society");

      // Successfully joined, navigate to catalogue
      router.push("/catalogue");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Join error");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 mb-4">
          <Users className="h-6 w-6" />
        </div>

        <h1 className="text-xl font-bold text-gray-900">Join Your Society Pool</h1>
        <p className="text-xs text-gray-500 mt-1">
          Enter your 6-character society join code or use an invite link from your society Captain.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Join Code Input */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Society Join Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. GGH100"
                maxLength={10}
                className="flex-1 uppercase tracking-wider rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:border-brand-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleLookup(joinCode)}
                disabled={loading || !joinCode.trim()}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-black disabled:opacity-50"
              >
                {loading ? "Finding..." : "Find"}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Demo Code: <strong>GGH100</strong> (Green Glen Heights)</p>
          </div>

          {/* Step 2: Society Details & Flat Selection */}
          {society && (
            <form onSubmit={handleJoin} className="space-y-4 pt-3 border-t border-gray-100 animate-fadeIn">
              <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-3.5">
                <div className="flex items-center gap-1.5 text-brand-800 font-bold text-xs">
                  <CheckCircle2 className="h-4 w-4 text-brand-600" />
                  <span>{society.name}</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  {society.addressLine}, {society.city} {society.pincode}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-medium text-gray-900 focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Your Flat / Apartment</label>
                <select
                  value={selectedFlatId}
                  onChange={(e) => setSelectedFlatId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs font-medium text-gray-900 focus:border-brand-500 focus:outline-none"
                  required
                >
                  {society.flats.map((flat) => (
                    <option key={flat.id} value={flat.id}>
                      {flat.tower ? `${flat.tower} - ` : ""}Flat {flat.flatNumber}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  100 flats available. Captain approves collection at the Clubhouse drop point.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                <span>{submitting ? "Joining Society..." : "Confirm & Enter Pool"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
