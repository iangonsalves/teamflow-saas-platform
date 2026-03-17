import Link from "next/link";

type PageBackLinkProps = {
  href: string;
  label: string;
};

export function PageBackLink({ href, label }: PageBackLinkProps) {
  return (
    <Link
      className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-900 no-underline shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:bg-white"
      href={href}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </Link>
  );
}
