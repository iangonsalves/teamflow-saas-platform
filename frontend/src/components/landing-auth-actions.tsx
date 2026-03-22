"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { clearAuthSession, getStoredUser, hasAuthSession } from "@/lib/auth-storage";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = () => callback();
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

export function LandingAuthActions() {
  const router = useRouter();
  // Keep the server snapshot stable and only read localStorage-backed auth on the client.
  const signedIn = useSyncExternalStore(subscribe, hasAuthSession, () => false);
  const userName = signedIn ? getStoredUser()?.name ?? null : null;

  if (!signedIn) {
    return (
      <>
        <Link className="tf-btn-primary min-w-[180px]" href="/register">
          Create account
        </Link>
        <Link className="tf-btn-secondary min-w-[180px]" href="/login">
          Sign in
        </Link>
        <Link
          className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
          href="/dashboard"
        >
          View dashboard
        </Link>
      </>
    );
  }

  return (
    <>
      <Link className="tf-btn-primary min-w-[180px]" href="/dashboard">
        View dashboard
      </Link>
      <Link className="tf-btn-secondary min-w-[180px]" href="/account">
        {userName ? `Account: ${userName}` : "View account"}
      </Link>
      <button
        className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-slate-900/12 bg-white/80 px-6 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-900/20 hover:bg-white"
        onClick={() => {
          clearAuthSession();
          router.refresh();
        }}
        type="button"
      >
        Sign out
      </button>
    </>
  );
}
