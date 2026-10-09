import Link from "next/link";
import { getCurrentUserFromCookies } from "@/app/lib/dal";
import LogoutButton from "@/app/components/LogoutButton";
import ThemeToggle from "@/app/components/ThemeToggle";
import ActiveNavLink from "@/app/components/ActiveNavLink";

export default async function Header() {
  const currUser = await getCurrentUserFromCookies();

  return (
    <header
      className="
        shadow-sm border-b
        bg-(--surface) border-(--border)
        dark:bg-(--surface-dark) dark:border-(--border-dark)
      "
    >
      <div className="mx-auto px-6 py-4 flex justify-between items-center">
        <Link
          className="
            text-2xl font-bold tracking-tight
            text-(--text) dark:text-(--text-dark)
          "
          href="/"
        >
          LittleLedger
        </Link>

        {currUser ? (
          <nav className="flex gap-20 font-medium text-(--text-secondary) dark:text-(--text-secondary-dark)">
            <ActiveNavLink
              href="/dashboard"
              className="
                hover:text-(--text)
                dark:hover:text-(--text-dark)
                transition
              "
            >
              Dashboard
            </ActiveNavLink>
            <ActiveNavLink
              href="/accounts"
              className="
                hover:text-(--text)
                dark:hover:text-(--text-dark)
                transition
              "
            >
              Accounts
            </ActiveNavLink>
            <ActiveNavLink
              href="/analysis"
              className="
                hover:text-(--text)
                dark:hover:text-(--text-dark)
                transition
              "
            >
              Analysis
            </ActiveNavLink>
          </nav>
        ) : null}

        <div className="flex items-center gap-6">
          <nav
            className="
              flex gap-6 font-medium
              text-(--text-secondary)
              dark:text-(--text-secondary-dark)
            "
          >
            {currUser ? (
              <LogoutButton />
            ) : (
              <ActiveNavLink
                href="/login"
                className="
                  hover:text-(--text)
                  dark:hover:text-(--text-dark)
                  transition
                "
              >
                Login
              </ActiveNavLink>
            )}
          </nav>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
