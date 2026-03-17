import { PageBackLink } from "./page-back-link";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(231,111,81,0.24),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(42,157,143,0.28),_transparent_30%),linear-gradient(180deg,_#f5efe4_0%,_#f2eadc_100%)] px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <PageBackLink href={backHref} label={backLabel} />
      </div>
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-slate-600">
            {eyebrow}
          </p>
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight sm:text-6xl">
            {title}
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-700">
            {description}
          </p>
          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-900/10 bg-white/70 p-4 backdrop-blur">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                API-first
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                The frontend is wired directly to the NestJS auth endpoints you
                already tested in Swagger.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-900/10 bg-[#e8f1eb] p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                Next step
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Successful auth here becomes the base for the protected dashboard
                branch that follows.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-900/10 bg-white/78 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.1)] backdrop-blur sm:p-8">
          {children}
          <div className="mt-6 border-t border-slate-900/10 pt-5 text-sm text-slate-600">
            {footer}
          </div>
        </div>
      </section>
    </main>
  );
}
