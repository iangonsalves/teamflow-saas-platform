import type { ReactNode } from "react";

type ShellHeroHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: ReactNode;
  controls: ReactNode;
};

export function ShellHeroHeader({
  eyebrow,
  title,
  description,
  metrics,
  controls,
}: ShellHeroHeaderProps) {
  return (
    <header className="rounded-[2.25rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.09)] backdrop-blur">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_340px]">
        <div className="tf-hero rounded-[2rem] p-6">
          <p className="tf-brand-chip">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
          <div className="mt-6">{metrics}</div>
        </div>

        <div className="tf-dark-panel rounded-[2rem] p-6 text-slate-50">{controls}</div>
      </div>
    </header>
  );
}
