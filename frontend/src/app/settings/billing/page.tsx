import { Suspense } from "react";
import { BillingShell } from "@/components/billing-shell";

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingShell />
    </Suspense>
  );
}
