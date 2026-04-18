export default function HomePage() {
  return (
    <main
      className="
        min-h-screen
        bg-[var(--bg)] text-[var(--text)]
        dark:bg-[var(--bg-dark)] dark:text-[var(--text-dark)]
      "
    >
      <section className="px-6 py-24 md:py-32 max-w-5xl mx-auto text-center">
        <h1
          className="
            text-4xl md:text-6xl font-bold tracking-tight
            text-[var(--text)] dark:text-[var(--text-dark)]
          "
        >
          Welcome to Your Ledger
        </h1>
        
        <p
          className="
            mt-6 text-lg md:text-xl max-w-2xl mx-auto
            text-[var(--text-secondary)]
            dark:text-[var(--text-secondary-dark)]
          "
        >
          This is your personal space to understand and manage your finances.
          Explore your transactions, track your spending, and find insights into your money habits.
        </p>
      </section>
    </main>
  );
}