"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronDown, Factory, PackageCheck } from "lucide-react";
import { navLinks } from "@/lib/content";
import {
  getProductNavItems,
  isProductNavItemActive,
  isProductsSection,
  type ProductNavItem,
} from "@/lib/product-navigation";
import type { PublicCategory } from "@/lib/products";
import { cn } from "@/lib/utils";
import { usePagePathname } from "@/lib/use-page-pathname";
import Logo from "./Logo";
import MobileNavigation, { MobileMenuButton } from "./MobileNavigation";

export default function Header({ categories }: { categories: PublicCategory[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const productsRef = useRef<HTMLLIElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const path = usePagePathname();
  const hasOverlayHero =
    path === "/" ||
    path === "/about" ||
    path === "/industries" ||
    path === "/contact" ||
    path === "/products" ||
    path.startsWith("/products/");
  const transparent = hasOverlayHero && !scrolled;

  const primaryLinks = navLinks.filter((link) => link.label !== "Contact Us");
  const contactLink = navLinks.find((link) => link.label === "Contact Us");
  const productNavItems = getProductNavItems(categories);
  const productsActive = isProductsSection(pathname);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => setProductsOpen(false), 140);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setProductsOpen(false);
      setMobileOpen(false);
    }, 0);
    return () => clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 40;
      setScrolled((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!productsOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProductsOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (productsRef.current && !productsRef.current.contains(event.target as Node)) {
        setProductsOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [productsOpen]);

  useEffect(() => cancelScheduledClose, []);

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    setProductsOpen(true);
    const items = getMenuItems(menuRef.current);
    const index = event.key === "ArrowDown" ? 0 : Math.max(items.length - 1, 0);
    setTimeout(() => items[index]?.focus(), 50);
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    const items = getMenuItems(menuRef.current);
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(current + 1) % items.length].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(current <= 0 ? items.length - 1 : current - 1)].focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0].focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1].focus();
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[9999] w-full transition-[background-color,box-shadow,backdrop-filter] duration-300 ease-out",
        transparent
          ? "bg-transparent [text-shadow:0_1px_10px_rgba(0,59,92,0.55)]"
          : "bg-primary-deep shadow-[0_10px_30px_rgba(0,59,92,0.35)] backdrop-blur-md [text-shadow:none]",
      )}
    >
      <div className="relative z-[9999] mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo tone="light" />

        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {primaryLinks.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} active={pathname === link.href}>
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li
              ref={productsRef}
              className="relative"
              onMouseEnter={() => {
                cancelScheduledClose();
                setProductsOpen(true);
              }}
              onMouseLeave={scheduleClose}
            >
              <div
                className={cn(
                  "flex items-center rounded-md transition-colors",
                  productsActive && "bg-white/10",
                )}
              >
                <Link
                  href="/products"
                  onClick={() => setProductsOpen(false)}
                  aria-current={productsActive ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center rounded-l-md py-2 pl-3 pr-1.5 text-sm font-medium transition-colors",
                    productsActive ? "font-semibold text-white" : "text-white/90 hover:text-white",
                  )}
                >
                  Products
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-accent transition-transform duration-200",
                      productsActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </Link>
                <button
                  ref={toggleRef}
                  type="button"
                  aria-label={productsOpen ? "Close Products menu" : "Open Products menu"}
                  aria-expanded={productsOpen}
                  aria-controls="products-dropdown"
                  aria-haspopup="menu"
                  onClick={() => {
                    cancelScheduledClose();
                    setProductsOpen((value) => !value);
                  }}
                  onKeyDown={handleTriggerKeyDown}
                  className={cn(
                    "rounded-r-md px-1.5 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    productsOpen ? "text-accent" : "text-white/80 hover:text-accent",
                  )}
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "size-4 transition-transform duration-200",
                      productsOpen && "rotate-180 text-accent",
                    )}
                  />
                </button>
              </div>

              <ul
                id="products-dropdown"
                ref={menuRef}
                role="menu"
                aria-label="Product categories"
                aria-hidden={!productsOpen}
                onKeyDown={handleMenuKeyDown}
                className={cn(
                  "absolute left-0 top-full z-[10000] mt-3 w-[min(22rem,calc(100vw-2rem))] origin-top rounded-xl border border-slate-200 bg-white p-2 shadow-[0_24px_60px_-20px_rgba(0,59,92,0.4)] [text-shadow:none] transition-[opacity,transform,visibility] duration-200 ease-out",
                  productsOpen
                    ? "visible translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none invisible -translate-y-1 scale-[0.98] opacity-0",
                )}
              >
                {productNavItems.map((item) => {
                  const active = isProductNavItemActive(item, pathname);
                  return (
                    <li key={item.slug} role="none">
                      <Link
                        href={item.href}
                        role="menuitem"
                        aria-current={active ? "page" : undefined}
                        tabIndex={productsOpen ? 0 : -1}
                        onClick={() => {
                          cancelScheduledClose();
                          setProductsOpen(false);
                        }}
                        className={cn(
                          "group flex gap-3 rounded-lg p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                          active ? "bg-[#EAF3FA]" : "hover:bg-[#EAF3FA]",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary group-hover:text-white",
                            active && "bg-primary text-white",
                          )}
                        >
                          <ProductNavIcon icon={item.icon} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-primary-deep transition-colors group-hover:text-primary">
                            {item.label}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                            {item.description}
                          </span>
                        </span>
                        <ArrowUpRight
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-slate-400 transition-colors group-hover:text-primary"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
            {contactLink ? (
              <li>
                <NavLink href={contactLink.href} active={pathname === contactLink.href}>
                  {contactLink.label}
                </NavLink>
              </li>
            ) : null}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-primary-deep shadow-sm transition-colors hover:bg-accent-dark lg:inline-flex"
          >
            Request a Quote
          </Link>
          <MobileMenuButton
            open={mobileOpen}
            onToggle={() => setMobileOpen((value) => !value)}
          />
        </div>
      </div>

      <div id="mobile-navigation" className="z-[10000]">
        <MobileNavigation
          categories={categories}
          pathname={pathname}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative block rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "font-semibold text-white" : "text-white/90 hover:text-white",
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-accent transition-transform duration-200",
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        )}
      />
    </Link>
  );
}

function ProductNavIcon({ icon }: { icon: ProductNavItem["icon"] }) {
  const className = "size-5";
  return icon === "factory" ? (
    <Factory aria-hidden="true" className={className} />
  ) : (
    <PackageCheck aria-hidden="true" className={className} />
  );
}

function getMenuItems(menu: HTMLUListElement | null): HTMLAnchorElement[] {
  return Array.from(menu?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []);
}
