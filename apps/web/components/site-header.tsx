import Link from 'next/link';

/**
 * Site chrome. Deliberately minimal: no notification bell, no profile nudge, no
 * streak. The product is search → read → save → leave.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-header border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:gap-6">
        <Link
          href="/"
          className="shrink-0 cursor-pointer text-md font-bold tracking-tight transition-colors duration-fast hover:text-accent"
        >
          Precedent
        </Link>

        {/* Secondary nav yields first on narrow screens — the CTA and the
            wordmark are what must survive at 375px. */}
        <nav aria-label="Main" className="hidden items-center gap-4 text-sm sm:flex">
          <Link
            href="/search"
            className="cursor-pointer text-ink-secondary transition-colors duration-fast hover:text-ink"
          >
            Search
          </Link>
          <Link
            href="/compare"
            className="cursor-pointer text-ink-secondary transition-colors duration-fast hover:text-ink"
          >
            Compare
          </Link>
          <Link
            href="/trust"
            className="cursor-pointer text-ink-secondary transition-colors duration-fast hover:text-ink"
          >
            Trust
          </Link>
        </nav>

        <div className="ml-auto shrink-0">
          <Link
            href="/submit"
            className="inline-flex h-9 cursor-pointer items-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors duration-fast"
            style={{ background: 'var(--color-accent)', color: 'var(--color-ink-on-accent)' }}
          >
            <span className="sm:hidden">Add pathway</span>
            <span className="hidden sm:inline">Add your pathway</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
