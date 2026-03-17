"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequestWithToken } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";

type WorkspaceSummary = {
  id: string;
  name: string;
  members: Array<{ role: string }>;
};

type SubscriptionSummary = {
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubId?: string | null;
};

type CheckoutResponse = {
  checkoutUrl: string | null;
  sessionId: string;
};

const plans = [
  {
    id: "PRO",
    name: "Pro",
    description: "Single-team paid plan for a more realistic SaaS billing flow.",
  },
  {
    id: "TEAM",
    name: "Team",
    description: "Higher-tier collaboration plan placeholder for Stripe testing.",
  },
] as const;

export function BillingShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    const accessToken = token;

    let cancelled = false;

    async function loadBillingState() {
      try {
        const workspaces = await apiRequestWithToken<WorkspaceSummary[]>(
          "/workspaces",
          accessToken,
        );

        if (cancelled) {
          return;
        }

        const firstWorkspace = workspaces[0] ?? null;
        setWorkspace(firstWorkspace);

        if (!firstWorkspace) {
          setSubscription(null);
          return;
        }

        const currentSubscription = await apiRequestWithToken<SubscriptionSummary>(
          `/workspaces/${firstWorkspace.id}/billing/subscription`,
          accessToken,
        );

        if (!cancelled) {
          setSubscription(currentSubscription);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load billing.",
          );
        }
      }
    }

    void loadBillingState();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleCheckout(plan: "PRO" | "TEAM") {
    const token = getAccessToken();

    if (!token || !workspace) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(plan);

    try {
      const response = await apiRequestWithToken<CheckoutResponse>(
        `/workspaces/${workspace.id}/billing/checkout-session`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ plan }),
        },
      );

      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
        return;
      }

      setErrorMessage("Stripe checkout URL was not returned.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start checkout.",
      );
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(33,158,188,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.24),_transparent_30%),linear-gradient(180deg,_#f7f1e7_0%,_#efe7d8_100%)] px-6 py-8 text-slate-900 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.09)] backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-slate-500">
            TeamFlow Billing
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Subscription management
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            This page is ready for Stripe test mode. Once your real Stripe test
            keys and price IDs are added to the environment, the plan buttons
            will create real checkout sessions.
          </p>
          <div className="mt-5 flex gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              href="/dashboard"
            >
              Back to dashboard
            </Link>
          </div>
        </header>

        {searchParams.get("checkout") === "success" ? (
          <div className="mt-6 rounded-2xl border border-[#2a9d8f]/25 bg-[#edf8f5] px-5 py-4 text-sm text-[#1f6c63]">
            Stripe returned successfully. Once webhooks are connected with your
            real Stripe account, subscription status updates will appear here.
          </div>
        ) : null}

        {searchParams.get("checkout") === "cancelled" ? (
          <div className="mt-6 rounded-2xl border border-[#e76f51]/25 bg-[#fff0eb] px-5 py-4 text-sm text-[#a13f24]">
            Checkout was cancelled before completion.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-[#e76f51]/25 bg-[#fff0eb] px-5 py-4 text-sm text-[#a13f24]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
              Current subscription
            </p>
            <div className="mt-4 rounded-2xl bg-slate-900 p-5 text-slate-50">
              <p className="text-xl font-semibold">
                {subscription?.plan ?? "FREE"}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Status: {subscription?.status ?? "INACTIVE"}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Workspace: {workspace?.name ?? "No workspace loaded"}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {plans.map((plan) => (
              <div
                className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur"
                key={plan.id}
              >
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                  {plan.name} plan
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {plan.name}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {plan.description}
                </p>
                <button
                  className="mt-5 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={!workspace || isSubmitting !== null}
                  onClick={() => void handleCheckout(plan.id)}
                  type="button"
                >
                  {isSubmitting === plan.id ? "Starting checkout..." : `Choose ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
