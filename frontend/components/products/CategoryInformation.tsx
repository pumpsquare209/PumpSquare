import Link from "next/link";
import { categoryText } from "@/lib/category-content";
import type { PublicCategory } from "@/lib/products";
import CategoryProductImage from "./CategoryProductImage";

type InfoBlock = {
  title: string;
  value: string;
};

export default function CategoryInformation({
  category,
  mainCategory,
}: {
  category: PublicCategory;
  mainCategory: PublicCategory | null;
}) {
  const blocks: InfoBlock[] = [
    { title: "How It Works", value: category.howItWorks },
    { title: "Why Use It", value: category.usageInfo },
    { title: "Applications", value: category.applications },
    { title: "Industries", value: category.industries },
    { title: "Additional Information", value: category.additionalInfo },
  ]
    .map((block) => ({ title: block.title, value: categoryText(block.value) }))
    .filter((block) => block.value.trim().length > 0);

  const introduction = categoryText(category.content).trim() || categoryText(category.description).trim();

  return (
    <section aria-labelledby="about-pump-type-heading" className="bg-[#F7F9FC] py-14 sm:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
          <div className="rounded-3xl border border-line bg-white p-7 shadow-[0_18px_40px_-32px_rgba(0,59,92,0.45)] sm:p-10">
            <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">About This Pump-Type</p>
            <h2
              id="about-pump-type-heading"
              className="mt-3 font-display text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl"
            >
              {category.name}
            </h2>
            <span aria-hidden="true" className="mt-4 block h-1 w-14 rounded-full bg-accent" />
            {introduction ? (
              <p className="mt-6 whitespace-pre-line text-base leading-[1.8] text-muted">{introduction}</p>
            ) : (
              <p className="mt-6 text-base leading-[1.8] text-muted">
                Category information is being prepared. Browse the range below or contact our team for technical guidance.
              </p>
            )}

            {blocks.length > 0 ? (
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {blocks.map((block) => (
                  <article
                    key={block.title}
                    className="rounded-2xl border border-line bg-[#FBFCFE] p-5"
                  >
                    <h3 className="font-display text-base font-bold text-primary-deep">{block.title}</h3>
                    <span aria-hidden="true" className="mt-2 block h-0.5 w-8 rounded-full bg-accent" />
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{block.value}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {mainCategory ? (
              <div className="mt-10 border-t border-line pt-6">
                <Link
                  href={`/products/category/${mainCategory.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to {mainCategory.name}
                </Link>
              </div>
            ) : null}
          </div>

          <aside className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_18px_40px_-32px_rgba(0,59,92,0.45)]">
            <div className="relative aspect-[4/3] bg-primary-soft/50">
              <CategoryProductImage
                src={category.categoryImageUrl}
                alt={`${category.name} overview`}
                fill
                sizes="(min-width: 1024px) 400px, 100vw"
                className="object-contain p-6"
                fallbackLabel="Category image coming soon"
              />
            </div>
            <div className="border-t border-line p-6">
              <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">Visual Overview</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {category.name} — {mainCategory?.name ?? "industrial pumping solutions"}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
