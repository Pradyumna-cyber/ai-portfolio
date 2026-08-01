"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/work", label: "Work" },
  { href: "/thinking", label: "Thinking" },
  { href: "/experience", label: "Experience" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="shell flex h-16 items-center justify-between">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden="true">
            PA
          </span>
          <span>Applied AI Builder</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navigation.map((item) => (
            <NavLink key={item.href} {...item} active={pathname === item.href} />
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            className="icon-button menu-toggle md:hidden"
            type="button"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label="Toggle navigation"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav
          id="mobile-navigation"
          className="shell grid gap-1 border-t border-border py-3 md:hidden"
          aria-label="Mobile navigation"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname === item.href}
              onClick={() => setOpen(false)}
            />
          ))}
        </nav>
      ) : null}
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn("nav-link", active && "nav-link-active")}
    >
      {label}
    </Link>
  );
}
