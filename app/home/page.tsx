export default function HomePage() {
  return (
    <main
      className="
        min-h-screen
        bg-(--bg) text-(--text)
        dark:bg-(--bg-dark) dark:text-(--text-dark)
      "
    >
      <section className="px-6 py-24 md:py-32 max-w-5xl mx-auto text-center">
        <h1
          className="
            text-4xl md:text-6xl font-bold tracking-tight
            text-(--text) dark:text-(--text-dark)
          "
        >
          Welcome to Your Ledger
        </h1>
        
        <p
          className="
            mt-6 text-lg md:text-xl max-w-2xl mx-auto
            text-(--text-secondary)
            dark:text-(--text-secondary-dark)
          "
        >
          This is your personal space to understand and manage your finances.
          Explore your transactions, track your spending, and find insights into your money habits.
        </p>
      </section>
    </main>
  );
}