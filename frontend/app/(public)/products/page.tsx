import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import { getCategoriesResult } from "@/lib/products-server";
import type { PublicCategory } from "@/lib/products";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse Pumpsquare Systems LLP pumps and process equipment — progressive cavity, screw, gear and lobe pumps for industrial applications.",
};

type CardPresentation = {
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt: string;
  useCategoryImage?: boolean;
  panelBackground: string;
  clipPath: string;
  badge: "gear" | "seim";
  order: number;
};

const CARD_PRESENTATION: Record<string, CardPresentation> = {
  "pumps-manufactured-by-us": {
    title: "Pumps Manufactured by Us",
    description:
      "Positive displacement pumps engineered and manufactured by Pumpsquare for industrial, chemical, food and oil & gas duties.",
    imageSrc: "/images/Industrial_Blue_Pump_Assembly-removebg-preview.png",
    imageAlt: "Pumpsquare manufactured industrial blue pump",
    panelBackground: "linear-gradient(135deg,#EAF6FF 0%,#CDE7FA 58%,#A9D4F0 100%)",
    clipPath: "polygon(28% 0,100% 0,100% 100%,0 100%)",
    badge: "gear",
    order: 0,
  },
  "pumps-traded-by-us": {
    title: "Pumps Traded by Us (SEIM Pumps)",
    description:
      "Genuine SEIM positive displacement pumps and associated equipment supplied through our trading partnership.",
    imageAlt: "SEIM positive displacement pump supplied by Pumpsquare",
    useCategoryImage: true,
    panelBackground: "linear-gradient(135deg,#0B557F 0%,#003B5C 62%,#002A43 100%)",
    clipPath: "polygon(22% 0,100% 0,100% 100%,0 100%)",
    badge: "seim",
    order: 1,
  },
};

function SettingsIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M10.3 3.9a1 1 0 011.4 0l.6.6a1 1 0 001.4 0l.7-.3a1 1 0 011.3.4l.5.9a1 1 0 001.2.5l.8-.2a1 1 0 011.2.7l.3.8a1 1 0 001 .7h1a1 1 0 011 1v1a1 1 0 01-.7 1l-.8.2a1 1 0 00-.5 1.2l.4.9a1 1 0 01-.4 1.3l-.7.6a1 1 0 000 1.4l.6.6a1 1 0 010 1.4l-.9.9a1 1 0 01-1.3.4l-.8-.3a1 1 0 00-1.2.5l-.5.9a1 1 0 01-1 .7h-1a1 1 0 01-1-1v-.8a1 1 0 00-.7-1l-.9-.3a1 1 0 00-1.2.5l-.6.8a1 1 0 01-1.4 0l-.9-.9a1 1 0 01-.4-1.3l.3-.8a1 1 0 00-.5-1.2l-.9-.5a1 1 0 01-.7-1v-1a1 1 0 011-1h.8a1 1 0 001-.7l.3-.9a1 1 0 00-.5-1.2l-.8-.6a1 1 0 010-1.4l.9-.9a1 1 0 011.3-.4l.8.3a1 1 0 001.2-.5l.5-.9a1 1 0 011-.7h1z"
      />
      <circle cx="12" cy="12" r="3" strokeWidth={1.7} />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14m-6-6l6 6-6 6"
      />
    </svg>
  );
}

function MainCategoryCard({ category }: { category: PublicCategory }) {
  const presentation = CARD_PRESENTATION[category.slug];
  const imageSrc = presentation.useCategoryImage
    ? category.categoryImageUrl || "/images/pumpsquare-equipment-clean.png"
    : presentation.imageSrc || "/images/Industrial_Blue_Pump_Assembly-removebg-preview.png";

  return (
    <Link
      href={`/products/category/${category.slug}`}
      aria-label={`Explore ${presentation.title}`}
      className="group relative isolate flex h-full min-h-[360px] flex-col overflow-hidden rounded-[22px] border border-[#D8E7F2] bg-gradient-to-br from-white via-[#FAFDFF] to-[#EEF7FD] shadow-[0_12px_34px_rgba(0,59,92,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[#BDD8EB] hover:shadow-[0_22px_48px_rgba(0,59,92,0.18)] md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 top-auto h-[52%] w-full md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[58%]"
        style={{
          backgroundImage: presentation.panelBackground,
          clipPath: presentation.clipPath,
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -right-16 z-[1] h-44 w-44 rounded-full border-[16px] border-accent/90 sm:h-48 sm:w-48 lg:h-52 lg:w-52 lg:border-[18px]"
      />

      <div className="relative z-20 flex flex-1 flex-col p-7 sm:p-8 md:p-6 lg:p-9">
        {presentation.badge === "seim" ? (
          <div className="relative flex h-12 w-14 items-center justify-center rounded-xl border border-line bg-white shadow-sm">
            <Image
              src="/images/seim_logo.png"
              alt="SEIM"
              fill
              sizes="56px"
              className="object-contain p-1.5"
            />
          </div>
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#E4F2FB] text-primary shadow-sm">
            <SettingsIcon />
          </div>
        )}

        <h3 className="mt-5 max-w-md font-display text-[21px] font-extrabold leading-[1.16] tracking-tight text-primary-deep sm:text-[22px] lg:text-[26px]">
          {presentation.title}
        </h3>
        <p className="mt-3 max-w-md text-[14px] leading-[1.65] text-[#5F7180] sm:text-[15px]">
          {presentation.description}
        </p>

        <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-primary-deep shadow-[0_8px_18px_rgba(255,209,0,0.35)] transition-colors duration-300 group-hover:bg-accent-dark">
          Explore Products
          <ArrowIcon />
        </span>
      </div>

      <div className="pointer-events-none relative z-10 h-52 w-full md:h-full">
        <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-center">
          <div className="relative h-[92%] w-[78%] md:h-[86%] md:w-[92%] lg:w-[94%]">
            <Image
              src={imageSrc}
              alt={presentation.imageAlt}
              fill
              sizes="(max-width: 1023px) 100vw, 50vw"
              className={`object-contain drop-shadow-[0_18px_22px_rgba(0,59,92,0.22)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.04] ${
                presentation.badge === "seim" ? "object-bottom" : "object-center"
              }`}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductsPageSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="grid gap-6 md:grid-cols-2 lg:gap-7">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[360px] overflow-hidden rounded-[22px] border border-[#D8E7F2] bg-[#F8FBFE]"
          >
            <div className="h-full w-full bg-[linear-gradient(135deg,#FFFFFF_0%,#EAF4FC_100%)] p-8">
              <div className="h-12 w-12 rounded-xl bg-[#E4F2FB]" />
              <div className="mt-6 h-7 w-3/4 rounded bg-[#DCE8F1]" />
              <div className="mt-4 h-4 w-full rounded bg-[#E7EFF5]" />
              <div className="mt-2 h-4 w-2/3 rounded bg-[#E7EFF5]" />
              <div className="mt-12 h-10 w-36 rounded-full bg-accent/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  return (
    <div
      className={`rounded-xl border p-5 text-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-accent/40 bg-accent-soft text-primary-deep"
      }`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

async function MainCategoriesSection() {
  const { categories, error } = await getCategoriesResult();

  const mainCategories = categories
    .filter((category) => category.level === 0 && category.isActive !== false)
    .filter((category) => Boolean(CARD_PRESENTATION[category.slug]))
    .sort(
      (a, b) =>
        CARD_PRESENTATION[a.slug].order - CARD_PRESENTATION[b.slug].order ||
        a.name.localeCompare(b.name),
    );

  return (
    <section aria-labelledby="main-categories-heading" className="bg-white py-14 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
          <h2
            id="main-categories-heading"
            className="font-display text-2xl font-bold tracking-tight text-primary-deep sm:text-[34px] sm:leading-tight"
          >
            Product Categories
          </h2>
          <span aria-hidden="true" className="mx-auto mt-4 block h-1 w-14 rounded-full bg-accent" />
          <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-lg">
            Select a main category to explore our product range.
          </p>
        </div>

        {error ? (
          <Notice tone="error">
            We could not load product categories right now. Please try again shortly.
          </Notice>
        ) : mainCategories.length === 0 ? (
          <Notice>
            The product category catalogue is being prepared. Please check back shortly.
          </Notice>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:gap-7">
            {mainCategories.map((category) => (
              <MainCategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function ProductsPage() {
  return (
    <>
      <PageHero
        title="Our Products"
        description="Pumps and process equipment engineered for demanding industrial duties — browse by category or search the catalogue."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Products" }]}
        backgroundImage="/images/Precision Manufacturing Workshop Blueprint.png"
        imageAlt="Precision machined pump components on engineering drawings"
        imagePosition="object-[45%_58%] lg:object-[62%_center]"
        imageClassName="scale-[0.62] md:scale-[0.8] lg:scale-100"
        imageOverlay={{
          desktop:
            "linear-gradient(90deg,rgba(0,59,92,0.94)_0%,rgba(0,59,92,0.84)_34%,rgba(0,59,92,0.38)_70%,rgba(0,59,92,0.14)_100%)",
          mobile:
            "linear-gradient(160deg,rgba(0,59,92,0.94)_0%,rgba(0,59,92,0.84)_55%,rgba(0,59,92,0.58)_100%)",
        }}
      />

      <Suspense fallback={<ProductsPageSkeleton />}>
        <MainCategoriesSection />
      </Suspense>
    </>
  );
}
