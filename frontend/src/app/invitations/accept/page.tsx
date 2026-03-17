import { Suspense } from "react";
import { AcceptInvitationShell } from "@/components/accept-invitation-shell";

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationShell />
    </Suspense>
  );
}
