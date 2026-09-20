"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavHeader() {
  const pathname = usePathname();

  const navItems = [
    { href: "/scan", label: "Scanner" },
    { href: "/guide", label: "Guide" },
    { href: "/science", label: "Science" },
  ];

  return (
    <header className="border-b border-line bg-surface/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center space-x-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-protect rounded"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-protect inline-block" aria-hidden="true" />
          <span className="font-bold tracking-tight text-ink text-base">WingGap</span>
          <span className="text-xs font-mono uppercase tracking-wider text-ink-secondary border-l border-line pl-2.5 hidden sm:inline">
            Field Instrument
          </span>
        </Link>

        <nav className="flex items-center space-x-1 sm:space-x-3 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded text-xs sm:text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-protect ${
                  isActive
                    ? "bg-canvas text-ink font-semibold border border-line"
                    : "text-ink-secondary hover:text-ink hover:bg-canvas/50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
