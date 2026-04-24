import Link from "next/link";

export default function LandingPage() {
  return (
    <main
      className="
        min-h-screen
        bg-(--bg) text-(--text)
        dark:bg-(--bg-dark) dark:text-(--text-dark)
      "
    >
      {/* Hero Section */}
      <section className="px-6 py-24 md:py-32 max-w-5xl mx-auto text-center">
        <h1
          className="
            text-4xl md:text-6xl font-bold tracking-tight
            text-(--text) dark:text-(--text-dark)
          "
        >
          Ledger, by the Fireside
        </h1>

        <p
          className="
            mt-6 text-lg md:text-xl max-w-2xl mx-auto
            text-(--text-secondary)
            dark:text-(--text-secondary-dark)
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
              bg-(--primary) hover:bg-(--primary-hover)
              dark:bg-(--primary-dark) dark:hover:bg-(--primary-hover-dark)
              transition
            "
          >
            Open Ledger
          </Link>

          <Link
            href="#features"
            className="
              px-6 py-3 rounded-lg font-medium
              border border-(--border)
              text-(--text-secondary)
              hover:bg-(--surface)
              dark:border-(--border-dark)
              dark:text-(--text-secondary-dark)
              dark:hover:bg-(--surface-dark)
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
          bg-(--surface) border-t border-(--divider)
          dark:bg-(--surface-dark) dark:border-(--divider-dark)
        "
      >
        <div className="max-w-5xl mx-auto">
          <h2
            className="
              text-3xl md:text-4xl font-bold text-center
              text-(--text) dark:text-(--text-dark)
            "
          >
            Crafted for Comfort
          </h2>

          <div className="mt-12 grid md:grid-cols-3 gap-10">
            {/* Card 1 */}
            <div
              className="
                p-6 rounded-xl shadow-sm
                bg-(--card) border border-(--border)
                dark:bg-(--card-dark) dark:border-(--border-dark)
              "
            >
              <h3
                className="
                  text-xl font-semibold
                  text-(--text) dark:text-(--text-dark)
                "
              >
                Local & Private
              </h3>
              <p
                className="
                  mt-3
                  text-(--text-secondary)
                  dark:text-(--text-secondary-dark)
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
                bg-(--card) border border-(--border)
                dark:bg-(--card-dark) dark:border-(--border-dark)
              "
            >
              <h3
                className="
                  text-xl font-semibold
                  text-(--text) dark:text-(--text-dark)
                "
              >
                Thoughtful Categorization
              </h3>
              <p
                className="
                  mt-3
                  text-(--text-secondary)
                  dark:text-(--text-secondary-dark)
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
                bg-(--card) border border-(--border)
                dark:bg-(--card-dark) dark:border-(--border-dark)
              "
            >
              <h3
                className="
                  text-xl font-semibold
                  text-(--text) dark:text-(--text-dark)
                "
              >
                Fast & Lightweight
              </h3>
              <p
                className="
                  mt-3
                  text-(--text-secondary)
                  dark:text-(--text-secondary-dark)
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
