"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequestWithToken } from "@/lib/api";
import { useToast } from "./ui/toast-provider";

type Invitation = {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expiresAt: string;
};

type InvitationsPanelProps = {
  workspaceId: string | null;
  token: string | null;
  canManage: boolean;
};

export function InvitationsPanel({
  workspaceId,
  token,
  canManage,
}: InvitationsPanelProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const inviteBaseUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/invitations/accept`;
  }, []);

  async function loadInvitations() {
    if (!workspaceId || !token || !canManage) {
      return;
    }

    const items = await apiRequestWithToken<Invitation[]>(
      `/workspaces/${workspaceId}/invitations`,
      token,
    );
    setInvitations(items);
  }

  useEffect(() => {
    if (errorMessage) {
      showToast(errorMessage, "error");
    }
  }, [errorMessage, showToast]);

  useEffect(() => {
    if (successMessage) {
      showToast("Invitation created.", "success");
    }
  }, [showToast, successMessage]);

  async function handleCreateInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspaceId || !token || !canManage) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const invitation = await apiRequestWithToken<Invitation>(
        `/workspaces/${workspaceId}/invitations`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ email, role }),
        },
      );

      setSuccessMessage(
        `Invitation created. Share this link: ${inviteBaseUrl}?token=${invitation.token}`,
      );
      setEmail("");
      await loadInvitations();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create invitation.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setInvitations([]);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!workspaceId || !token || !canManage) {
      return;
    }

    const activeWorkspaceId = workspaceId;
    const accessToken = token;
    let cancelled = false;

    async function syncInvitations() {
      try {
        const items = await apiRequestWithToken<Invitation[]>(
          `/workspaces/${activeWorkspaceId}/invitations`,
          accessToken,
        );

        if (!cancelled) {
          setInvitations(items);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load invitations.",
          );
        }
      }
    }

    void syncInvitations();

    return () => {
      cancelled = true;
    };
  }, [canManage, token, workspaceId]);

  return (
    <section className="rounded-[2.15rem] border border-slate-200 bg-white p-6 shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Invitations
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-900">
            Invite new teammates
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create a token-based workspace invitation and share the generated link.
          </p>
        </div>
        <button
          className="tf-btn-secondary px-4 py-2 disabled:opacity-50"
          disabled={!workspaceId || !token || !canManage}
          onClick={() => void loadInvitations()}
          type="button"
        >
          Refresh
        </button>
      </div>

      {canManage ? (
        <form
          className="mt-5 rounded-[1.8rem] border border-slate-200 bg-slate-50 p-4 shadow-sm"
          onSubmit={handleCreateInvitation}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <input
              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="invitee@example.com"
              required
              type="email"
              value={email}
            />
            <select
              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
              onChange={(event) => setRole(event.target.value)}
              value={role}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              className="tf-btn-primary"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <>
                  <span className="tf-spinner mr-2" />
                  Creating...
                </>
              ) : (
                "Create invite"
              )}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-5 text-sm text-slate-600">
          You need owner or admin permissions to create workspace invitations.
        </p>
      )}

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

      <div className="mt-5 grid gap-3">
        {invitations.length > 0 ? (
          invitations.map((invitation) => (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" key={invitation.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {invitation.email}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {invitation.role} · {invitation.status}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="tf-empty-state rounded-[1.5rem] px-5 py-8 text-center text-sm text-slate-600">
            <p className="text-lg font-semibold text-slate-900">No invitations yet</p>
            <p className="mt-2">
              Create the first invite to onboard a teammate into this workspace.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
