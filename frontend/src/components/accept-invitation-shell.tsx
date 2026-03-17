"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiRequestWithToken } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";

export function AcceptInvitationShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const token = searchParams.get("token");

  async function handleAccept() {
    const accessToken = getAccessToken();

    if (!accessToken) {
      router.push("/login");
      return;
    }

    if (!token) {
      setErrorMessage("Invitation token is missing.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await apiRequestWithToken("/invitations/accept", accessToken, {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setSuccessMessage("Invitation accepted. You can now return to the dashboard.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to accept invitation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(33,158,188,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.24),_transparent_30%),linear-gradient(180deg,_#f7f1e7_0%,_#efe7d8_100%)] px-6 py-10 text-slate-900">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-slate-900/10 bg-white/75 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.09)] backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-slate-500">
          TeamFlow Invitation
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Accept your workspace invite.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          If you are logged in with the invited email address, TeamFlow will add
          you to the workspace as soon as you accept.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-900/10 bg-[#f7efe2] p-4 text-sm text-slate-700">
          Token: {token ?? "Missing token in URL"}
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-[#e76f51]/25 bg-[#fff0eb] px-4 py-3 text-sm text-[#a13f24]">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-[#2a9d8f]/25 bg-[#edf8f5] px-4 py-3 text-sm text-[#1f6c63]">
            {successMessage}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting}
            onClick={() => void handleAccept()}
            type="button"
          >
            {isSubmitting ? "Accepting..." : "Accept invitation"}
          </button>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
