export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,162,97,0.35),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(42,157,143,0.28),_transparent_30%),linear-gradient(180deg,_#f8f4ec_0%,_#f4efe5_100%)] text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-6 py-10 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-slate-600">
              TeamFlow
            </p>
            <h1 className="mt-3 max-w-2xl text-5xl font-semibold tracking-tight sm:text-6xl">
              Task management for teams that need structure without friction.
            </h1>
          </div>
          <div className="hidden rounded-full border border-slate-900/10 bg-white/60 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-slate-600 backdrop-blur md:block">
            Setup Baseline
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.25fr_0.9fr] lg:items-end">
          <div className="space-y-6">
            <p className="max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
              TeamFlow is a multi-tenant SaaS platform for workspaces, projects,
              and task execution. This setup branch establishes the frontend,
              backend, database baseline, and documentation so feature branches
              can build on a clean foundation.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
                href="http://localhost:3001/docs"
              >
                API Docs
              </a>
              <a
                className="inline-flex items-center justify-center rounded-full border border-slate-900/15 bg-white/70 px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-white"
                href="https://github.com"
              >
                Repo Workflow
              </a>
            </div>
          </div>

          <div className="grid gap-4 rounded-[2rem] border border-slate-900/10 bg-white/70 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="rounded-2xl bg-slate-900 p-5 text-slate-50">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-slate-300">
                Core stack
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                <li>Next.js App Router</li>
                <li>NestJS API</li>
                <li>PostgreSQL + Prisma</li>
                <li>JWT auth + RBAC</li>
              </ul>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-900/10 bg-[#f7efe2] p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                  MVP
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Auth, workspaces, projects, tasks, dashboard, and audit logs.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-900/10 bg-[#e6f4f1] p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                  Phase 2
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Invitations, Stripe billing, premium gating, and richer activity.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
