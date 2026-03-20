"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequestWithToken } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-storage";
import { AppPageShell } from "./shell/app-page-shell";
import { ShellHeroHeader } from "./shell/shell-hero-header";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "./ui/toast-provider";

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

type PortalResponse = {
  portalUrl: string;
};

type InvoiceSummary = {
  id: string;
  amountPaid: number;
  currency: string;
  status: string | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: string;
};

function formatMoney(amountInMinorUnits: number, currency: string) {
  return (amountInMinorUnits / 100).toLocaleString(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

function formatInvoiceStatus(status: string | null) {
  if (!status) {
    return "Unknown";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
  const { showToast } = useToast();
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
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
          setInvoices([]);
          return;
        }

        const [currentSubscription, invoiceHistory] = await Promise.all([
          apiRequestWithToken<SubscriptionSummary>(
            `/workspaces/${firstWorkspace.id}/billing/subscription`,
            accessToken,
          ),
          apiRequestWithToken<InvoiceSummary[]>(
            `/workspaces/${firstWorkspace.id}/billing/invoices`,
            accessToken,
          ),
        ]);

        if (!cancelled) {
          setSubscription(currentSubscription);
          setInvoices(invoiceHistory);
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

  useEffect(() => {
    if (errorMessage) {
      showToast(errorMessage, "error");
    }
  }, [errorMessage, showToast]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      showToast("Stripe checkout completed.", "success");
    }
    if (searchParams.get("checkout") === "cancelled") {
      showToast("Stripe checkout was cancelled.", "info");
    }
  }, [searchParams, showToast]);

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

  async function handlePortalOpen() {
    const token = getAccessToken();

    if (!token || !workspace) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting("PORTAL");

    try {
      const response = await apiRequestWithToken<PortalResponse>(
        `/workspaces/${workspace.id}/billing/portal-session`,
        token,
        {
          method: "POST",
        },
      );

      window.location.href = response.portalUrl;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to open billing portal.",
      );
    } finally {
      setIsSubmitting(null);
    }
  }

  if (!workspace && !errorMessage) {
    return (
      <AppPageShell maxWidth="5xl">
        <div className="space-y-6">
          <div className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-md">
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="mt-5 h-12 w-[min(24rem,72%)] rounded-2xl" />
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={index}>
                  <Skeleton className="h-3 w-20 rounded-full" />
                  <Skeleton className="mt-4 h-8 w-16 rounded-xl" />
                  <Skeleton className="mt-3 h-3 w-28 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Skeleton className="h-72 rounded-[2rem]" />
            <Skeleton className="h-72 rounded-[2rem]" />
          </div>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell backHref="/dashboard" backLabel="Back to dashboard" maxWidth="5xl">
      <ShellHeroHeader
        controls={
          <>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
              Control
            </p>
            <p className="mt-4 text-2xl font-semibold">Manage the paid layer.</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {subscription?.stripeCustomerId
                ? "The Stripe customer is ready, so portal access is available."
                : "Run one successful checkout to create the Stripe customer, then unlock the portal."}
            </p>
            <div className="mt-6 grid gap-3">
              <button
                className="tf-btn-ghost disabled:opacity-60"
                disabled={!workspace || !subscription?.stripeCustomerId || isSubmitting !== null}
                onClick={() => void handlePortalOpen()}
                type="button"
              >
                {isSubmitting === "PORTAL" ? (
                  <>
                    <span className="tf-spinner mr-2" />
                    Opening portal...
                  </>
                ) : (
                  "Manage subscription"
                )}
              </button>
              <button
                className="tf-btn-primary"
                disabled={!workspace || isSubmitting !== null}
                onClick={() => void handleCheckout("PRO")}
                type="button"
              >
                {isSubmitting === "PRO" ? (
                  <>
                    <span className="tf-spinner mr-2" />
                    Starting checkout...
                  </>
                ) : (
                  "Upgrade to Pro"
                )}
              </button>
            </div>
          </>
        }
        description="Manage the paid layer of the workspace without leaving the product surface. Stripe handles checkout and the customer portal, while this page stays focused on state, plan choices, and invoice history."
        eyebrow="TeamFlow Billing"
        metrics={
          <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Workspace
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">
                    {workspace?.name ?? "No workspace"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Billing context for this page
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Plan
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">
                    {subscription?.plan ?? "FREE"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Current subscription plan
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-blue-200 bg-white p-4 shadow-sm">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Invoices
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{invoices.length}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Recent billing records available
                  </p>
                </div>
          </div>
        }
        title="Subscription management"
      />

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
          <div className="rounded-[2.1rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                  Current subscription
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                  Billing control center
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Upgrade through checkout, manage billing in Stripe, and review
                  the latest invoice activity from one page.
                </p>
              </div>
              <span className="rounded-full bg-[#edf8f5] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#1f6c63]">
                {subscription?.status ?? "INACTIVE"}
              </span>
            </div>

            <div className="mt-5 rounded-[1.75rem] bg-slate-900 p-5 text-slate-50">
              <p className="text-xl font-semibold">{subscription?.plan ?? "FREE"}</p>
              <p className="mt-2 text-sm text-slate-300">
                Workspace: {workspace?.name ?? "No workspace loaded"}
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Customer created: {subscription?.stripeCustomerId ? "Yes" : "No"}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-[#edf8f5] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#1f6c63]">
                {subscription?.status ?? "INACTIVE"}
              </span>
            </div>
            {!subscription?.stripeCustomerId ? (
              <p className="mt-3 text-sm text-slate-600">
                Complete checkout once to create the Stripe customer before using the portal.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4">
            {plans.map((plan) => (
              <div
                className="rounded-[2.1rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur"
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

        <section className="mt-6 rounded-[2.1rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Billing history
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                Recent invoices
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <div
                  className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-900/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={invoice.id}
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {formatMoney(invoice.amountPaid, invoice.currency)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {new Date(invoice.createdAt).toLocaleDateString()} ·{" "}
                      {formatInvoiceStatus(invoice.status)}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {invoice.hostedInvoiceUrl ? (
                      <a
                        className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-900 no-underline transition hover:bg-slate-50"
                        href={invoice.hostedInvoiceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="text-slate-900">View invoice</span>
                      </a>
                    ) : null}
                    {invoice.invoicePdf ? (
                      <a
                        className="inline-flex min-w-[132px] items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-slate-700"
                        href={invoice.invoicePdf}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="text-white">Download PDF</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">
                No invoices yet. Once Stripe bills this workspace, recent invoices will appear here.
              </p>
            )}
          </div>
        </section>
    </AppPageShell>
  );
}
