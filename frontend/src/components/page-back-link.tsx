import Link from "next/link";

type PageBackLinkProps = {
  href: string;
  label: string;
};

export function PageBackLink({ href, label }: PageBackLinkProps) {
  return (
    <Link
      className="tf-btn-secondary gap-2 px-4 py-2 no-underline shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
      href={href}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </Link>
  );
}
