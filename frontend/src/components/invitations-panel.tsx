"use client";

import { useMemo, useState } from "react";
import { apiRequestWithToken } from "@/lib/api";

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

  return (
    <section className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Invitations
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create a token-based workspace invitation and share the generated link.
          </p>
        </div>
        <button
          className="rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!workspaceId || !token || !canManage}
          onClick={() => void loadInvitations()}
          type="button"
        >
          Refresh
        </button>
      </div>

      {canManage ? (
        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]" onSubmit={handleCreateInvitation}>
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
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Creating..." : "Create invite"}
          </button>
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
            <div
              className="rounded-2xl border border-slate-900/10 bg-[#f7efe2] p-4"
              key={invitation.id}
            >
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
          <p className="text-sm text-slate-600">
            No invitations loaded yet. Create one or refresh to view the current list.
          </p>
        )}
      </div>
    </section>
  );
}
