import ThemeToggle from "./components/ThemeToggle";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Ledger",
  description: "A warm, cozy place to understand your money",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const activeDark = stored === 'dark' || (!stored && systemPrefersDark);
                  if (activeDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body
        className="
          min-h-screen flex flex-col
          bg-[var(--bg)] text-[var(--text)]
          dark:bg-[var(--bg-dark)] dark:text-[var(--text-dark)]
        "
      >
        {/* Header */}
        <header
          className="
            shadow-sm border-b
            bg-[var(--surface)] border-[var(--border)]
            dark:bg-[var(--surface-dark)] dark:border-[var(--border-dark)]
          "
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1
              className="
                text-2xl font-bold tracking-tight
                text-[var(--text)] dark:text-[var(--text-dark)]
              "
            >
              Ledger
            </h1>

            <div className="flex items-center gap-6">
              <nav
                className="
                  flex gap-6 font-medium
                  text-[var(--text-secondary)]
                  dark:text-[var(--text-secondary-dark)]
                "
              >
                <Link
                  href="/"
                  className="
                    hover:text-[var(--text)]
                    dark:hover:text-[var(--text-dark)]
                    transition
                  "
                >
                  Home
                </Link>
                <Link
                  href="/app"
                  className="
                    hover:text-[var(--text)]
                    dark:hover:text-[var(--text-dark)]
                    transition
                  "
                >
                  App
                </Link>
                <Link
                  href="/about"
                  className="
                    hover:text-[var(--text)]
                    dark:hover:text-[var(--text-dark)]
                    transition
                  "
                >
                  About
                </Link>
              </nav>

              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer
          className="
            py-8 text-center text-sm
            bg-[var(--surface)] border-t border-[var(--border)]
            text-[var(--text-secondary)]
            dark:bg-[var(--surface-dark)] dark:border-[var(--border-dark)]
            dark:text-[var(--text-secondary-dark)]
          "
        >
          © {new Date().getFullYear()} Ledger. Built with warmth.
        </footer>
      </body>
    </html>
  );
}
