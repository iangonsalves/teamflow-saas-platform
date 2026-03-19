"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequestWithToken } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";
import { PageBackLink } from "./page-back-link";
import { useToast } from "./ui/toast-provider";

export function AcceptInvitationShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    if (errorMessage) {
      showToast(errorMessage, "error");
    }
  }, [errorMessage, showToast]);

  useEffect(() => {
    if (successMessage) {
      showToast("Invitation accepted.", "success");
    }
  }, [showToast, successMessage]);

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
      <div className="mx-auto mb-6 max-w-3xl">
        <PageBackLink href="/dashboard" label="Back to dashboard" />
      </div>
      <section className="mx-auto max-w-4xl rounded-[2.2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.1)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_320px]">
          <div className="tf-hero rounded-[2rem] p-6">
            <p className="tf-brand-chip">TeamFlow Invitation</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Accept your workspace invite.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              If you are signed in with the invited email address, TeamFlow will
              add you to the workspace immediately after acceptance.
            </p>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Invitation token
              </p>
              <p className="mt-3 break-all text-sm text-slate-700">
                {token ?? "Missing token in URL"}
              </p>
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
          </div>

          <div className="tf-dark-panel rounded-[2rem] p-6 text-slate-50">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
              Control
            </p>
            <p className="mt-4 text-2xl font-semibold">Join the workspace.</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Accept the invite, then return to the dashboard to see the new team context.
            </p>
            <div className="mt-6 grid gap-3">
              <button
                className="tf-btn-primary"
                disabled={isSubmitting}
                onClick={() => void handleAccept()}
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <span className="tf-spinner mr-2" />
                    Accepting...
                  </>
                ) : (
                  "Accept invitation"
                )}
              </button>
              <button
                className="tf-btn-ghost"
                onClick={() => router.push("/dashboard")}
                type="button"
              >
                Return to dashboard
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
