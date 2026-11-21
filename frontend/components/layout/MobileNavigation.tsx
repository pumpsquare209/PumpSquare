"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Factory, PackageCheck, X } from "lucide-react";
import { navLinks } from "@/lib/content";
import {
  getProductNavItems,
  isProductNavItemActive,
  isProductsSection,
  type ProductNavItem,
} from "@/lib/product-navigation";
import type { PublicCategory } from "@/lib/products";
import { cn } from "@/lib/utils";

type MobileNavigationProps = {
  categories: PublicCategory[];
  pathname: string;
  open: boolean;
  onClose: () => void;
};

export default function MobileNavigation({
  categories,
  pathname,
  open,
  onClose,
}: MobileNavigationProps) {
  const [productsOpen, setProductsOpen] = useState(false);
  const productNavItems = getProductNavItems(categories);
  const productsActive = isProductsSection(pathname);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!open) setProductsOpen(false);
    }, 0);
    return () => clearTimeout(timeout);
  }, [open]);

  if (!open) return null;

  return (
    <div className="relative z-[10000] border-t border-white/15 bg-primary-deep/95 backdrop-blur-md [text-shadow:none] md:hidden">
      <nav
        aria-label="Mobile navigation"
        className="mx-auto max-w-7xl px-4 py-4 sm:px-6"
      >
        <ul className="flex flex-col gap-1">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-md border-l-4 px-3 py-2.5 text-base font-medium transition-colors",
                    active
                      ? "border-accent bg-white/10 font-semibold text-white"
                      : "border-transparent text-white/90 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setProductsOpen((value) => !value)}
              aria-expanded={productsOpen}
              aria-controls="mobile-products-dropdown"
              className={cn(
                "flex w-full items-center justify-between rounded-md border-l-4 px-3 py-2.5 text-base font-medium transition-colors",
                productsActive
                  ? "border-accent bg-white/10 font-semibold text-white"
                  : "border-transparent text-white/90 hover:bg-white/10 hover:text-white",
              )}
            >
              Products
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 text-white/70 transition-transform duration-200",
                  productsOpen && "rotate-180 text-accent",
                )}
              />
            </button>
            <div
              id="mobile-products-dropdown"
              aria-hidden={!productsOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                productsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <ul className="mt-2 space-y-2 pl-2">
                  {productNavItems.map((item) => {
                    const active = isProductNavItemActive(item, pathname);
                    return (
                      <li key={item.slug}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          tabIndex={productsOpen ? 0 : -1}
                          className={cn(
                            "group flex gap-3 rounded-lg border border-white/10 p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                            active
                              ? "border-accent/60 bg-white/10"
                              : "bg-white/5 hover:border-white/25 hover:bg-white/10",
                          )}
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white transition-colors group-hover:bg-accent group-hover:text-primary-deep">
                            <MobileProductNavIcon icon={item.icon} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-white">
                              {item.label}
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed text-white/70">
                              {item.description}
                            </span>
                          </span>
                          <ArrowUpRight
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0 text-white/60 transition-colors group-hover:text-accent"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </li>
        </ul>

        <Link
          href="/contact"
          onClick={onClose}
          className="mt-4 flex w-full items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-semibold text-primary-deep transition-colors hover:bg-accent-dark"
        >
          Request a Quote
        </Link>
      </nav>
    </div>
  );
}

export function MobileMenuButton({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="mobile-navigation"
      aria-label={open ? "Close menu" : "Open menu"}
      className="grid size-11 place-items-center rounded-md border border-white/40 text-white transition-colors hover:border-white hover:bg-white/10 md:hidden"
    >
      {open ? (
        <X aria-hidden="true" className="size-5" />
      ) : (
        <span className="grid gap-1.5">
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
        </span>
      )}
    </button>
  );
}

function MobileProductNavIcon({ icon }: { icon: ProductNavItem["icon"] }) {
  const className = "size-4";
  return icon === "factory" ? (
    <Factory aria-hidden="true" className={className} />
  ) : (
    <PackageCheck aria-hidden="true" className={className} />
  );
}
