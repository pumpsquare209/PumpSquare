"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type TouchEvent,
} from "react";
import { CheckCircle2 } from "lucide-react";
import type { TechnicalContent } from "@/lib/products";
import { REVIEW_TABS } from "@/lib/products";
import { hasRichText, RichText } from "@/lib/rich-text";
import { tabDisplayName } from "@/lib/review-tabs";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    __ticks?: number;
  }
}

const AUTOPLAY_MS = 5000;
const TOUCH_RESUME_MS = 8000;

type TabView = {
  key: string;
  label: string;
  heading: string;
  intro: string;
  features: { label?: string; text: string }[];
};

type Props = {
  technical?: TechnicalContent;
};

// Saves made before tabs were dynamic carry no order; fall back to the
// standard tab layout for those rows only.
function savedOrder(key: string) {
  const index = REVIEW_TABS.findIndex((tab) => tab.key === key);
  return index === -1 ? REVIEW_TABS.length : index;
}

// Pixels of the section that must be on screen before autoplay runs.
function overlapFloor(viewportHeight: number) {
  return Math.min(200, Math.max(60, viewportHeight * 0.15));
}

// Tabs left empty in the admin are not rendered.
function hasContent(tab: TabView) {
  return tab.features.length > 0 || hasRichText(tab.intro) || tab.heading.length > 0;
}

/**
 * "Product Reviews" tabs, rendered from whatever the administrator saved for
 * this product: standard and custom tabs, in the saved order, hidden ones
 * omitted. The performance table, materials table and explanation paragraphs
 * belong to the product and render identically under every tab.
 */
export default function TechnicalTabs({ technical }: Props) {
  const openTabs: TabView[] = (technical?.tabs ?? [])
    .filter((tab) => tab.enabled)
    .sort((a, b) => (a.sortOrder ?? savedOrder(a.key)) - (b.sortOrder ?? savedOrder(b.key)))
    .flatMap((tab) => {
      // The label is rendered exactly as saved; a custom tab without a name is
      // skipped rather than replaced by its identifier.
      const label = tabDisplayName(tab);
      if (!label) return [];
      return [
        {
          key: tab.key,
          label,
          heading: tab.heading.trim() || label,
          intro: tab.intro,
          features: tab.features,
        },
      ];
    })
    .filter(hasContent);

  const [selected, setSelected] = useState(openTabs[0]?.key ?? "");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const sectionRef = useRef<HTMLElement | null>(null);
  const tablistRef = useRef<HTMLDivElement | null>(null);
  // True between touchstart and touchmove/touchend, so a release outside the
  // section still ends the touch interaction.
  const touchActiveRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();
  const instanceId = useId();

  const tabCount = openTabs.length;
  const selectedIndex = openTabs.findIndex((tab) => tab.key === selected);
  const activeIndex = selectedIndex === -1 ? 0 : selectedIndex;

  // Every reason to pause rotation, plus the selection itself, is mirrored in a
  // ref so the timer callback never reads stale values.
  const autoplayRef = useRef({ index: 0, canRotate: false });
  const [paused, setPaused] = useState({ hover: false, focus: false, reading: false, hidden: false, offscreen: false });
  const [touchMode, setTouchMode] = useState(false);
  const [touchInteracting, setTouchInteracting] = useState(false);
  // Blocks rotation until this timestamp (touch/tap quiet window); null when
  // rotation is free to run.
  const [holdUntil, setHoldUntil] = useState<number | null>(null);
  // Incremented by every manual tap, click or key press so the running
  // interval is replaced and its 5 seconds start again.
  const [manualSelections, setManualSelections] = useState(0);

  // Rotation runs unless reduced motion is requested or the visitor is reading.
  const canRotate = tabCount > 1 && !prefersReducedMotion && !paused.hover && !paused.focus && !paused.reading && !paused.hidden && !paused.offscreen;
  // Touch visitors get a short quiet window after interacting; the tab that is
  // active in that window resumes once the window lapses.
  const shouldRotate = canRotate && !touchInteracting && holdUntil === null;

  useEffect(() => {
    autoplayRef.current = { ...autoplayRef.current, index: activeIndex, canRotate };
  }, [activeIndex, canRotate]);

  useEffect(() => {
    // Hover pause only makes sense on devices with a real pointer.
    const pointerQuery = window.matchMedia("(hover: hover)");
    const syncPageState = () => {
      setTouchMode(!pointerQuery.matches);
      setPaused((current) => ({ ...current, hidden: document.visibilityState !== "visible" }));
    };
    syncPageState();
    document.addEventListener("visibilitychange", syncPageState);
    pointerQuery.addEventListener("change", syncPageState);
    return () => {
      document.removeEventListener("visibilitychange", syncPageState);
      pointerQuery.removeEventListener("change", syncPageState);
    };
  }, []);

  // Only rotate while the section is meaningfully on screen. Re-created when
  // the active tab changes so the panel is measured at its current size.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        // A tall section is "readable" once a slice of it (up to a quarter of
        // the viewport) is on screen; an area ratio would report it hidden.
        const rect = entry.boundingClientRect;
        const root = entry.rootBounds ?? { top: 0, height: window.innerHeight };
        const overlap = Math.max(0, Math.min(rect.bottom, root.top + root.height) - Math.max(rect.top, root.top));
        const offscreen = !entry.isIntersecting || overlap < Math.min(overlapFloor(root.height), rect.height);
        setPaused((current) => ({ ...current, offscreen }));
      },
      { threshold: [0, 0.3, 0.6] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [selected]);

  // A single autoplay timer for the whole rotation. It exists (and is cleaned
  // up) only while rotation is allowed; pauses carry no timer at all, so
  // hovering or leaving the tab can never leave a stray interval behind.
  useEffect(() => {
    if (!shouldRotate) return;
    const id = window.setInterval(() => {
      (window.__ticks = (window.__ticks || 0) + 1);
      const state = autoplayRef.current;
      if (!state.canRotate) return;
      const next = openTabs[(state.index + 1) % openTabs.length];
      if (next) setSelected(next.key);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [shouldRotate, openTabs, manualSelections]);

  // Flip the quiet window at the right moment; effect re-runs never schedule a
  // duplicate.
  useEffect(() => {
    if (holdUntil === null) return;
    const delay = holdUntil - Date.now();
    if (delay <= 0) return;
    const id = window.setTimeout(() => setHoldUntil(null), delay);
    return () => window.clearTimeout(id);
  }, [holdUntil]);

  // Selecting a tab or using the panel restarts the 5 second countdown without
  // switching tabs.
  const markInteraction = useCallback(() => {
    setManualSelections((count) => count + 1);
    setHoldUntil(shouldRotate ? Date.now() : null);
  }, [shouldRotate]);

  const endTouchInteraction = useCallback(() => {
    if (!touchActiveRef.current) return;
    touchActiveRef.current = false;
    setTouchInteracting(false);
    setHoldUntil(Date.now() + TOUCH_RESUME_MS);
  }, []);

  const beginTouchInteraction = useCallback(() => {
    setPaused((current) => ({ ...current, reading: false }));
    touchActiveRef.current = true;
    setTouchInteracting(true);
    setHoldUntil(null);
  }, []);

  useEffect(() => {
    const end = () => endTouchInteraction();
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => {
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, [endTouchInteraction]);

  // Keep the active tab (including autoplay changes) scrolled into view inside
  // the horizontally scrolling tab strip — never the page itself.
  useEffect(() => {
    const strip = tablistRef.current;
    const tab = tabRefs.current[selected];
    if (!strip || !tab) return;
    const stripRect = strip.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    if (tabRect.left < stripRect.left || tabRect.right > stripRect.right) {
      strip.scrollTo({
        left: strip.scrollLeft + tabRect.left - stripRect.left - 8,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
  }, [selected, prefersReducedMotion]);

  // Page horizontally: on small screens the tab strip scrolls instead of the
  // page, and vertical swipes on it must not turn into taps.
  useEffect(() => {
    const strip = tablistRef.current;
    if (!strip) return;
    const onWheel = (event: WheelEvent) => {
      if (strip.scrollWidth <= strip.clientWidth || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      strip.scrollLeft += event.deltaX;
    };
    strip.addEventListener("wheel", onWheel, { passive: false });
    return () => strip.removeEventListener("wheel", onWheel);
  }, []);

  function onSectionEnter() {
    if (touchMode) return;
    setPaused((current) => ({ ...current, hover: true }));
  }

  function onSectionLeave() {
    setPaused((current) => ({ ...current, hover: false }));
  }

  function onSectionFocus(event: FocusEvent<HTMLElement>) {
    setPaused((current) => ({ ...current, focus: true }));
    // Keyboard/touch focus can land on a tab that is scrolled out of view.
    const strip = tablistRef.current;
    if (strip && event.target instanceof HTMLElement && event.target.closest("[role=tab]")) {
      strip.scrollLeft += event.target.getBoundingClientRect().left - strip.getBoundingClientRect().left - 8;
    }
  }

  function onSectionBlur(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setPaused((current) => ({ ...current, focus: false }));
  }

  // Keyboard use of non-tab controls in the panel (e.g. the horizontally
  // scrollable tables) also counts as reading.
  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof Element && !event.target.closest("[role=tab]")) markInteraction();
  }

  const firstTouch = useRef<{ x: number; y: number; target: Element | null } | null>(null);
  const cancelledClickRef = useRef<Element | null>(null);

  function onSectionTouchStart(event: TouchEvent<HTMLElement>) {
    if (event.touches.length > 1) return;
    beginTouchInteraction();
    const touch = event.touches[0];
    firstTouch.current = touch
      ? {
          x: touch.clientX,
          y: touch.clientY,
          target: event.target instanceof Element ? event.target.closest("[role=tab]") : null,
        }
      : null;
  }

  // A swipe that starts on a tab is a scroll of the tab strip, not a tap.
  function onSectionTouchMove(event: TouchEvent<HTMLElement>) {
    if (!touchInteracting) return;
    const first = firstTouch.current;
    const touch = event.touches[0];
    if (!first || !touch || !first.target) return;
    if (Math.abs(touch.clientX - first.x) > 8 || Math.abs(touch.clientY - first.y) > 8) {
      cancelledClickRef.current = first.target;
    }
  }

  function onClickCapture(event: MouseEvent<HTMLElement>) {
    if (cancelledClickRef.current && event.target === cancelledClickRef.current) {
      event.stopPropagation();
      event.preventDefault();
      cancelledClickRef.current = null;
    }
  }

  const performance = technical?.performance;
  const columns = performance?.columns ?? [];
  const rows = (performance?.rows ?? []).filter((row) => Object.values(row.cells).some((value) => value.trim()));
  const materials = technical?.materials ?? [];
  const paragraphs = (technical?.paragraphs ?? []).filter((paragraph) => hasRichText(paragraph.html));

  if (!openTabs.length) return null;

  const active = openTabs.find((tab) => tab.key === selected) ?? openTabs[0];

  // A manual choice shows immediately, then restarts the countdown so the
  // visitor is not moved on right after interacting.
  function selectTab(key: string) {
    setManualSelections((count) => count + 1);
    setSelected(key);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? openTabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + openTabs.length) % openTabs.length;
    const target = openTabs[next];
    selectTab(target.key);
    tabRefs.current[target.key]?.focus();
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="product-reviews-heading"
      data-debug={`${JSON.stringify(paused)}|rot=${shouldRotate}|ti=${touchInteracting}|hold=${holdUntil}|tm=${touchMode}`}
      className="mt-16"
      onMouseEnter={onSectionEnter}
      onMouseLeave={onSectionLeave}
      onFocus={onSectionFocus}
      onBlur={onSectionBlur}
      onTouchStart={onSectionTouchStart}
      onTouchMove={onSectionTouchMove}
      onClickCapture={onClickCapture}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-1 w-10 flex-shrink-0 rounded-full bg-accent" />
        <h2 id="product-reviews-heading" className="font-display text-xl font-extrabold tracking-tight text-primary-deep sm:text-2xl">
          Product Reviews
        </h2>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div
          ref={tablistRef}
          role="tablist"
          aria-label="Product reviews"
          className="flex gap-1 overflow-x-auto border-b border-line bg-primary-soft/40 px-2 py-2"
        >
          {openTabs.map((tab, index) => (
            <button
              key={tab.key}
              ref={(node) => {
                tabRefs.current[tab.key] = node;
              }}
              type="button"
              role="tab"
              id={`review-tab-${tab.key}`}
              aria-selected={tab.key === active.key}
              aria-controls={`review-panel-${tab.key}`}
              tabIndex={tab.key === active.key ? 0 : -1}
              onClick={() => selectTab(tab.key)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:px-5",
                tab.key === active.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-primary-deep hover:bg-white hover:text-primary",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`review-panel-${active.key}`}
          aria-labelledby={`review-tab-${active.key}`}
          tabIndex={0}
          className="p-5 focus:outline-none sm:p-8"
          onKeyDown={onPanelKeyDown}
          onCopy={markInteraction}
        >
          <p id={`review-status-${instanceId}`} aria-live="polite" aria-atomic="true" className="sr-only">
            {tabCount > 1
              ? `${active.label} tab, ${activeIndex + 1} of ${tabCount}.${canRotate ? " Tabs advance automatically; pause by focusing this section." : ""}`
              : ""}
          </p>
          <div key={active.key} className="animate-tab-content">
          <h3 className="font-display text-lg font-bold text-primary-deep sm:text-xl">{active.heading}</h3>
          <span aria-hidden="true" className="mt-2 block h-0.5 w-12 rounded-full bg-accent" />

          {hasRichText(active.intro) ? (
            <RichText
              html={active.intro}
              className="mt-4 space-y-3 text-base leading-[1.8] text-muted [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-primary-deep [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
            />
          ) : null}

          {active.features.length > 0 ? (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {active.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed text-ink">
                    {feature.label ? <strong className="font-semibold text-primary-deep">{feature.label}: </strong> : null}
                    {feature.text}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          {columns.length > 0 && rows.length > 0 ? (
            <div className="mt-10">
              <h4 className="font-display text-base font-bold text-primary-deep sm:text-lg">Performance Table</h4>
              <div className="mt-3 overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <caption className="sr-only">{`Performance table for ${active.heading}`}</caption>
                  <thead>
                    <tr className="bg-primary-deep text-left text-white">
                      {columns.map((column) => (
                        <th key={column.id} scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wide sm:text-sm sm:normal-case sm:tracking-normal">
                          {column.name}
                          {column.unit ? <span className="block text-[11px] font-medium text-steel sm:inline sm:pl-1 sm:text-xs">({column.unit})</span> : null}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={row.id} className={cn("border-t border-line", rowIndex % 2 ? "bg-primary-soft/30" : "bg-white")}>
                        {columns.map((column) => (
                          <td key={column.id} className="whitespace-nowrap px-4 py-3 text-ink">
                            {row.cells[column.id] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {materials.length > 0 ? (
            <div className="mt-10">
              <h4 className="font-display text-base font-bold text-primary-deep sm:text-lg">Materials of Construction</h4>
              <div className="mt-3 overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <caption className="sr-only">Materials of construction</caption>
                  <thead>
                    <tr className="bg-primary-deep text-left text-white">
                      <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wide sm:text-sm sm:normal-case sm:tracking-normal">Components</th>
                      <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wide sm:text-sm sm:normal-case sm:tracking-normal">Material of Construction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((row, rowIndex) => (
                      <tr key={row.id} className={cn("border-t border-line", rowIndex % 2 ? "bg-primary-soft/30" : "bg-white")}>
                        <td className="px-4 py-3 font-semibold text-primary-deep">{row.component}</td>
                        <td className="px-4 py-3 text-ink">
                          {row.material}
                          {row.specification ? <span className="block text-xs text-muted sm:inline sm:pl-2">{row.specification}</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {paragraphs.length > 0 ? (
            <div className="mt-10 rounded-xl bg-surface p-5 sm:p-6">
              <h4 className="font-display text-base font-bold text-primary-deep sm:text-lg">Technical Explanation &amp; Product Details</h4>
              {paragraphs.map((paragraph) => (
                <RichText
                  key={paragraph.id}
                  html={paragraph.html}
                  className="mt-3 space-y-3 text-sm leading-[1.8] text-muted sm:text-base [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-primary-deep [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
                />
              ))}
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
