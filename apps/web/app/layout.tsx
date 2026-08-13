import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';

import { SiteHeader } from '@/components/site-header';

import './globals.css';

/**
 * Two families, doing different jobs: Inter carries UI chrome and every
 * numeric, Source Serif carries the author's own prose. See
 * design-system/OVERRIDES.md #3.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui-loaded',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-text-loaded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Precedent — find people who already made your transition',
  description:
    'Search real people who have completed a specific academic or career transition, and see the exact sequence of steps they took.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="min-h-screen">
        {/* Keyboard users must be able to reach the results without tabbing
            through the entire facet rail. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-modal focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:shadow-md"
        >
          Skip to results
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
