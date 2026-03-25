import type { ReactNode } from "react";
import { PageBackLink } from "../page-back-link";

type AppPageShellProps = {
  children: ReactNode;
  maxWidth?: "4xl" | "5xl" | "6xl" | "7xl";
  backHref?: string;
  backLabel?: string;
  className?: string;
};

const widthClassMap = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

export function AppPageShell({
  children,
  maxWidth = "7xl",
  backHref,
  backLabel,
  className,
}: AppPageShellProps) {
  const widthClass = widthClassMap[maxWidth];

  return (
    <main
      className={`min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(42,157,143,0.14),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.14),_transparent_26%),linear-gradient(180deg,_#eddcbf_0%,_#dcc39a_100%)] px-6 py-8 text-slate-900 sm:px-8 ${className ?? ""}`}
    >
      <section className={`mx-auto ${widthClass}`}>
        {backHref && backLabel ? (
          <div className="mb-6">
            <PageBackLink href={backHref} label={backLabel} />
          </div>
        ) : null}
        {children}
      </section>
    </main>
  );
}
