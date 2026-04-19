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
          bg-(--bg) text-(--text)
          dark:bg-(--bg-dark) dark:text-(--text-dark)
        "
      >
        {/* Header */}
        <header
          className="
            shadow-sm border-b
            bg-(--surface) border-(--border)
            dark:bg-(--surface-dark) dark:border-(--border-dark)
          "
        >
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1
              className="
                text-2xl font-bold tracking-tight
                text-(--text) dark:text-(--text-dark)
              "
            >
              Ledger
            </h1>

            <div className="flex items-center gap-6">
              <nav
                className="
                  flex gap-6 font-medium
                  text-(--text-secondary)
                  dark:text-(--text-secondary-dark)
                "
              >
                <Link
                  href="/"
                  className="
                    hover:text-(--text)
                    dark:hover:text-(--text-dark)
                    transition
                  "
                >
                  Home
                </Link>
                <Link
                  href="/app"
                  className="
                    hover:text-(--text)
                    dark:hover:text-(--text-dark)
                    transition
                  "
                >
                  App
                </Link>
                <Link
                  href="/about"
                  className="
                    hover:text-(--text)
                    dark:hover:text-(--text-dark)
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
            bg-(--surface) border-t border-(--border)
            text-(--text-secondary)
            dark:bg-(--surface-dark) dark:border-(--border-dark)
            dark:text-(--text-secondary-dark)
          "
        >
          © {new Date().getFullYear()} Ledger. Built with warmth.
        </footer>
      </body>
    </html>
  );
}
