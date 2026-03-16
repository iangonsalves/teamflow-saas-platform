import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="TeamFlow Register"
      title="Create a TeamFlow account and connect to your backend in one step."
      description="This page sends the same registration payload to the backend auth module you already tested in Swagger, then stores the returned access token in the browser."
      footer={
        <span>
          Passwords must be at least 8 characters to match the backend validation rules.
        </span>
      }
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}
