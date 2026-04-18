import Link from "next/link";

export default function LandingPage() {
  return (
    <main
      className="
        min-h-screen
        bg-[var(--bg)] text-[var(--text)]
        dark:bg-[var(--bg-dark)] dark:text-[var(--text-dark)]
      "
    >
      {/* Hero Section */}
      <section className="px-6 py-24 md:py-32 max-w-5xl mx-auto text-center">
        <h1
          className="
            text-4xl md:text-6xl font-bold tracking-tight
            text-[var(--text)] dark:text-[var(--text-dark)]
          "
        >
          Ledger, by the Fireside
        </h1>

        <p
          className="
            mt-6 text-lg md:text-xl max-w-2xl mx-auto
            text-[var(--text-secondary)]
            dark:text-[var(--text-secondary-dark)]
          "
        >
          A warm, simple place to understand your money.
          Built for clarity, comfort, and peace of mind.
        </p>

        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/home"
            className="
              px-6 py-3 rounded-lg font-medium shadow-md text-white
              bg-[var(--primary)] hover:bg-[var(--primary-hover)]
              dark:bg-[var(--primary-dark)] dark:hover:bg-[var(--primary-hover-dark)]
              transition
            "
          >
            Open Ledger
          </Link>

          <Link
            href="#features"
            className="
              px-6 py-3 rounded-lg font-medium
              border border-[var(--border)]
              text-[var(--text-secondary)]
              hover:bg-[var(--surface)]
              dark:border-[var(--border-dark)]
              dark:text-[var(--text-secondary-dark)]
              dark:hover:bg-[var(--surface-dark)]
              transition
            "
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section
        className="
          px-6 py-20
          bg-[var(--surface)] border-t border-[var(--divider)]
          dark:bg-[var(--surface-dark)] dark:border-[var(--divider-dark)]
        "
      >
        <div className="max-w-5xl mx-auto">
          <h2
            className="
              text-3xl md:text-4xl font-bold text-center
              text-[var(--text)] dark:text-[var(--text-dark)]
            "
          >
            Crafted for Comfort
          </h2>

          <div className="mt-12 grid md:grid-cols-3 gap-10">
            {/* Card 1 */}
            <div
              className="
                p-6 rounded-xl shadow-sm
                bg-[var(--card)] border border-[var(--border)]
                dark:bg-[var(--card-dark)] dark:border-[var(--border-dark)]
              "
            >
              <h3
                className="
                  text-xl font-semibold
                  text-[var(--text)] dark:text-[var(--text-dark)]
                "
              >
                Local & Private
              </h3>
              <p
                className="
                  mt-3
                  text-[var(--text-secondary)]
                  dark:text-[var(--text-secondary-dark)]
                "
              >
                Your data stays with you — like a journal kept in a drawer,
                not in the cloud.
              </p>
            </div>

            {/* Card 2 */}
            <div
              className="
                p-6 rounded-xl shadow-sm
                bg-[var(--card)] border border-[var(--border)]
                dark:bg-[var(--card-dark)] dark:border-[var(--border-dark)]
              "
            >
              <h3
                className="
                  text-xl font-semibold
                  text-[var(--text)] dark:text-[var(--text-dark)]
                "
              >
                Thoughtful Categorization
              </h3>
              <p
                className="
                  mt-3
                  text-[var(--text-secondary)]
                  dark:text-[var(--text-secondary-dark)]
                "
              >
                Import statements, build rules, and let Ledger gently organize
                your financial story.
              </p>
            </div>

            {/* Card 3 */}
            <div
              className="
                p-6 rounded-xl shadow-sm
                bg-[var(--card)] border border-[var(--border)]
                dark:bg-[var(--card-dark)] dark:border-[var(--border-dark)]
              "
            >
              <h3
                className="
                  text-xl font-semibold
                  text-[var(--text)] dark:text-[var(--text-dark)]
                "
              >
                Fast & Lightweight
              </h3>
              <p
                className="
                  mt-3
                  text-[var(--text-secondary)]
                  dark:text-[var(--text-secondary-dark)]
                "
              >
                Powered by Bun + SQLite for instant performance — even on a
                cozy little Raspberry Pi.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
