import { AppPageShell } from "./shell/app-page-shell";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  backHref = "/",
  backLabel = "Back to home",
}: AuthShellProps) {
  return (
    <AppPageShell backHref={backHref} backLabel={backLabel} maxWidth="6xl">
      <section className="grid min-h-[calc(100vh-5rem)] gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div className="rounded-[2.15rem] border border-[#cbb08a] bg-[#efddbe] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-8">
          <div className="space-y-6">
            <p className="tf-brand-chip">{eyebrow}</p>
            <h1 className="max-w-xl text-5xl font-semibold tracking-tight sm:text-6xl">
              {title}
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-700">{description}</p>
            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[#b8cdee] bg-[#eef4ff] p-4 shadow-[0_12px_26px_rgba(37,99,235,0.08)]">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 font-mono text-[10px] font-semibold tracking-[0.16em] text-blue-700">
                    API
                  </span>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                    API-first
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  The frontend is wired directly to the NestJS auth endpoints you already tested in Swagger.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#a4cdbf] bg-[#dceee7] p-4 shadow-[0_12px_26px_rgba(42,157,143,0.08)]">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#d4efe6] font-mono text-[10px] font-semibold tracking-[0.16em] text-[#1f6c63]">
                    NX
                  </span>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                    Next step
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  Successful auth here becomes the base for the protected dashboard and workspace flow.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2.15rem] border border-[#cfb793] bg-[#fffaf2] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.12)] sm:p-8">
          {children}
          <div className="mt-6 border-t border-slate-900/10 pt-5 text-sm text-slate-600">
            {footer}
          </div>
        </div>
      </section>
    </AppPageShell>
  );
}
