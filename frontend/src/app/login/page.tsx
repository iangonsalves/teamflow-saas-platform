import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="TeamFlow Login"
      title="Get back into your workspace and keep the work moving."
      description="Sign in with the account you created through the TeamFlow API. This page talks directly to your NestJS backend and stores the access token locally for the next frontend branch."
      footer={
        <span>
          Test credentials come from the users you already created in the backend.
        </span>
      }
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
