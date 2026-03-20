"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequestWithToken } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";
import { AppPageShell } from "./shell/app-page-shell";
import { ShellHeroHeader } from "./shell/shell-hero-header";
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
    <AppPageShell backHref="/dashboard" backLabel="Back to dashboard" maxWidth="4xl">
      <ShellHeroHeader
        controls={
          <>
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
          </>
        }
        description="If you are signed in with the invited email address, TeamFlow will add you to the workspace immediately after acceptance."
        eyebrow="TeamFlow Invitation"
        metrics={
          <>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
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
          </>
        }
        title="Accept your workspace invite."
      />
    </AppPageShell>
  );
}
