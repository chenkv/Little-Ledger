import { ThemeProvider } from "@/app/lib/ThemeContext";
import { cookies } from "next/headers";
import Header from "@/app/components/Header";
import "./globals.css";

export const metadata = {
  title: "Ledger",
  description: "A warm, cozy place to understand your money",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <html lang="en" className={theme} suppressHydrationWarning>
      <head>
        <script />
      </head>

      <body
        className="
          min-h-screen flex flex-col
          bg-(--bg) text-(--text)
          dark:bg-(--bg-dark) dark:text-(--text-dark)
        "
      >
        <ThemeProvider initialTheme={theme}>
          {/* Header */}
          <Header />

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
        </ThemeProvider>
      </body>
    </html>
  );
}
