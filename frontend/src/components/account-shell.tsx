"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequestWithToken } from "@/lib/api";
import {
  clearAuthSession,
  getAccessToken,
  persistAuthSession,
  type AuthResponse,
  type AuthUser,
} from "@/lib/auth-storage";
import { AppPageShell } from "./shell/app-page-shell";
import { ShellHeroHeader } from "./shell/shell-hero-header";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "./ui/toast-provider";

type MeResponse = {
  user: {
    sub: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
};

export function AccountShell() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    const accessToken = token;
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await apiRequestWithToken<MeResponse>("/auth/me", accessToken);

        if (cancelled) {
          return;
        }

        const nextUser = {
          id: response.user.sub,
          email: response.user.email,
          name: response.user.name,
          avatarUrl: response.user.avatarUrl ?? null,
        };

        setUser(nextUser);
        setName(nextUser.name);
        setAvatarUrl(nextUser.avatarUrl ?? "");
        setAvatarFile(null);
        setRemoveAvatar(false);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load account.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (errorMessage) {
      showToast(errorMessage, "error");
    }
  }, [errorMessage, showToast]);

  const initials =
    user?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "TF";
  const avatarPreviewUrl = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }

    if (removeAvatar) {
      return "";
    }

    return avatarUrl;
  }, [avatarFile, avatarUrl, removeAvatar]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token) {
      clearAuthSession();
      router.push("/login");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("name", name);

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      if (removeAvatar) {
        formData.append("removeAvatar", "true");
      }

      const payload = await apiRequestWithToken<AuthResponse>("/auth/me", token, {
        method: "PATCH",
        body: formData,
      });

      persistAuthSession(payload);
      setUser(payload.user);
      setName(payload.user.name);
      setAvatarUrl(payload.user.avatarUrl ?? "");
      setAvatarFile(null);
      setRemoveAvatar(false);
      showToast("Account updated.", "success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update account.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppPageShell backHref="/dashboard" backLabel="Back to dashboard" maxWidth="5xl">
        <div className="space-y-6">
          <div className="rounded-[2.25rem] border border-[#b99563] bg-[#fff1dc] p-6 shadow-[0_30px_84px_rgba(15,23,42,0.14)]">
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="mt-5 h-12 w-[min(24rem,72%)] rounded-2xl" />
          </div>
          <Skeleton className="h-[28rem] rounded-[2rem]" />
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
            <p className="mt-4 text-2xl font-semibold">Manage your account.</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Update your public display information here. This affects the sidebar and other user-facing surfaces.
            </p>
            <div className="mt-6 grid gap-3">
              <Link className="tf-btn-ghost" href="/dashboard">
                Dashboard
              </Link>
              <Link className="tf-btn-ghost" href="/settings/billing">
                Billing
              </Link>
            </div>
          </>
        }
        description="Your account details travel with you across the TeamFlow shell, so this page keeps name and avatar settings in one place."
        eyebrow="TeamFlow Account"
        metrics={
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-[#cbb08a] bg-[#fffdfa] p-4 shadow-[0_12px_26px_rgba(15,23,42,0.08)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Name
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{user?.name}</p>
            </div>
            <div className="rounded-[1.5rem] border border-[#cbb08a] bg-[#fffdfa] p-4 shadow-[0_12px_26px_rgba(15,23,42,0.08)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Email
              </p>
              <p className="mt-3 truncate text-sm font-medium text-slate-900">{user?.email}</p>
            </div>
            <div className="rounded-[1.5rem] border border-[#cbb08a] bg-[#fffdfa] p-4 shadow-[0_12px_26px_rgba(15,23,42,0.08)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Avatar
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {user?.avatarUrl ? "Custom" : "Initials"}
              </p>
            </div>
          </div>
        }
        title="Account management"
      />

      <section className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-[#cfb793] bg-[#fffaf2] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Preview
          </p>
          <div className="mt-5 flex items-center gap-4 rounded-[1.6rem] border border-[#d7c5aa] bg-[#f4ead9] p-4">
            {avatarPreviewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                alt={`${name || user?.name || "User"} avatar`}
                className="h-16 w-16 rounded-2xl object-cover"
                src={avatarPreviewUrl}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#f8fafc_0%,_#94a3b8_100%)] text-lg font-semibold tracking-[0.18em] text-slate-900">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-slate-900">{name || user?.name}</p>
              <p className="truncate text-sm text-slate-600">{user?.email}</p>
            </div>
          </div>
        </div>

        <form
          className="rounded-[2rem] border border-[#cfb793] bg-[#fffaf2] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)]"
          onSubmit={handleSave}
        >
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Profile settings
          </p>
          <div className="mt-5 grid gap-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Name</span>
              <input
                className="w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-slate-900/30"
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Profile avatar</span>
              <input
                accept="image/*"
                className="w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-base text-slate-900 outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 focus:border-slate-900/30"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setAvatarFile(file);
                  if (file) {
                    setRemoveAvatar(false);
                  }
                }}
                type="file"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-sm text-slate-500">
                  Upload from desktop. Images are stored by the backend and saved on your profile.
                </p>
                {user?.avatarUrl ? (
                  <button
                    className="tf-btn-secondary px-4 py-2"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarUrl("");
                      setRemoveAvatar(true);
                    }}
                    type="button"
                  >
                    Remove avatar
                  </button>
                ) : null}
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                className="w-full rounded-2xl border border-slate-900/16 bg-[#f8f1e5] px-4 py-3 text-base text-slate-500 outline-none"
                readOnly
                value={user?.email ?? ""}
              />
            </label>

            <div className="flex justify-start md:justify-end">
              <button className="tf-btn-primary w-full md:w-auto" disabled={saving} type="submit">
                {saving ? (
                  <>
                    <span className="tf-spinner mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save account"
                )}
              </button>
            </div>
          </div>
        </form>
      </section>
    </AppPageShell>
  );
}
