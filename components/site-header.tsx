import Link from "next/link";

type SiteHeaderProps = {
  title: string;
};

export function SiteHeader({ title }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex shrink-0 items-center gap-4 border-b border-cyan-500/15 bg-[#030712]/85 px-4 py-3 backdrop-blur-md sm:px-6">
      <Link
        href="/"
        prefetch
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-cyan-400 transition-colors hover:bg-cyan-950/50 hover:text-cyan-300"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Home
      </Link>
      <span className="h-4 w-px bg-cyan-500/20" aria-hidden />
      <h1 className="truncate font-[family-name:var(--font-syne)] text-sm font-semibold text-cyan-50 sm:text-base">
        {title}
      </h1>
    </header>
  );
}
