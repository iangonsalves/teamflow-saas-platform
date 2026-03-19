import Link from "next/link";

const platformCards = [
  {
    title: "Overview",
    description: "Use the light dashboard for orientation, then drill into workspaces and projects only when action is needed.",
    tone: "bg-white/78",
  },
  {
    title: "Workspace",
    description: "Manage members, invitations, and delivery lanes from a workspace surface built for team operations.",
    tone: "bg-[#fff6ea]",
  },
  {
    title: "Project",
    description: "Move into a dedicated board for task movement, editing, assignment, and real delivery flow.",
    tone: "bg-[#e9f5f2]",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,162,97,0.22),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(42,157,143,0.2),_transparent_28%),linear-gradient(180deg,_#f8f3ea_0%,_#efe4d3_100%)] text-slate-900">
      <section className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12">
        <header className="flex items-center justify-between">
          <p className="tf-brand-chip">TeamFlow</p>
          <div className="rounded-full border border-slate-900/10 bg-white/65 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-slate-600 backdrop-blur">
            Product Overview
          </div>
        </header>

        <section className="relative mt-10 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white px-6 py-10 shadow-[0_35px_100px_rgba(15,23,42,0.12)] sm:px-10 sm:py-14">
          <div className="absolute left-[-8rem] top-[22%] h-48 w-48 rounded-full bg-[#f4c997]/35 blur-3xl" />
          <div className="absolute right-[-7rem] top-[10%] h-56 w-56 rounded-full bg-[#bfdbfe]/50 blur-3xl" />
          <div className="absolute bottom-[-8rem] left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-white/40 blur-3xl" />

          <div className="relative mx-auto max-w-4xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.34em] text-slate-500">
              Multi-tenant SaaS for team operations
            </p>
            <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Task management for teams that need structure without friction.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
              TeamFlow connects workspaces, projects, tasks, invitations, and billing into one
              operating system for small teams that need clarity more than clutter.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                className="tf-btn-primary min-w-[180px]"
                href="/register"
              >
                Create account
              </Link>
              <Link
                className="tf-btn-secondary min-w-[180px]"
                href="/login"
              >
                Sign in
              </Link>
              <Link
                className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                href="/dashboard"
              >
                View dashboard
              </Link>
            </div>
          </div>

          <div className="relative mt-12 grid gap-4 lg:grid-cols-[0.95fr_1.1fr_0.95fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Core stack
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <li>Next.js App Router</li>
                <li>NestJS API</li>
                <li>PostgreSQL + Prisma</li>
                <li>JWT auth + RBAC</li>
              </ul>
            </div>

            <div className="tf-dark-panel rounded-[2rem] p-6 text-slate-50">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-300">
                Guided flow
              </p>
              <p className="mt-4 text-2xl font-semibold">
                Start with auth, then move deeper only when needed.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Register or sign in, use the overview to orient yourself, then jump into
                workspace and project pages for the actual operational work.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                What is live
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                Auth, workspaces, roles, projects, tasks, invitations, Stripe billing, invoice
                history, and polished dashboard/workspace/project flows.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {platformCards.map((card) => (
            <article
              className={`rounded-[2rem] border border-slate-200 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${card.tone}`}
              key={card.title}
            >
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                {card.title}
              </p>
              <p className="mt-4 text-base font-semibold text-slate-900">
                {card.title} surface
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{card.description}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
