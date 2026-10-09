"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type ActiveNavLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export default function ActiveNavLink({
  href,
  children,
  className = "",
}: ActiveNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${className} ${isActive ? "underline underline-offset-4 decoration-2" : ""}`}
    >
      {children}
    </Link>
  );
}
