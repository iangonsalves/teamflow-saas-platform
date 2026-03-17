"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { apiRequest } from "@/lib/api";
import {
  type AuthResponse,
  persistAuthSession,
} from "@/lib/auth-storage";

type AuthFormMode = "login" | "register";

type AuthFormProps = {
  mode: AuthFormMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isRegister = mode === "register";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = await apiRequest<AuthResponse>(
        isRegister ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(
            isRegister
              ? { name, email, password }
              : { email, password },
          ),
        },
      );

      persistAuthSession(payload);

      startTransition(() => {
        router.push("/dashboard");
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          {isRegister ? "Create account" : "Welcome back"}
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
          {isRegister ? "Start with one workspace-ready account." : "Sign in to TeamFlow."}
        </h2>
      </div>

      {isRegister ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Name
          </span>
          <input
            className="w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-900/30"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Username"
            required
          />
        </label>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Email
        </span>
        <input
          className="w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-900/30"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="user@example.com"
          required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Password
        </span>
        <input
          className="w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-900/30"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="password"
          required
        />
      </label>

      {errorMessage ? (
        <div className="rounded-2xl border border-[#e76f51]/25 bg-[#fff0eb] px-4 py-3 text-sm text-[#a13f24]">
          {errorMessage}
        </div>
      ) : null}

      <button
        className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting
          ? "Submitting..."
          : isRegister
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="text-sm text-slate-600">
        {isRegister ? "Already have an account? " : "Need an account? "}
        <Link
          className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
          href={isRegister ? "/login" : "/register"}
        >
          {isRegister ? "Log in" : "Register"}
        </Link>
      </p>
    </form>
  );
}
