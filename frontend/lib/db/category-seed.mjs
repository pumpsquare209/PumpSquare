export const PUMPSQUARE_CATEGORIES = [
  {
    slug: "pumps-manufactured-by-us",
    name: "Pumps Manufactured by Us",
    parent: null,
    level: 0,
    description:
      "Positive displacement pumps engineered and manufactured by Pumpsquare for industrial, chemical, food and oil & gas duties.",
    categoryImageUrl:
      "https://vqzuvjubeohfsixguzpa.supabase.co/storage/v1/object/public/product-uploads/products/e576994f-96f5-4350-a2f3-27eaeac3e847/images/main-fecd2bd7-ed61-47dc-bdcf-a47d1d1c1ef6.png",
  },
  {
    slug: "pumps-traded-by-us",
    name: "Pumps Traded by Us (SEIM Pumps)",
    parent: null,
    level: 0,
    description:
      "Genuine SEIM positive displacement pumps and associated equipment supplied through our trading partnership.",
    categoryImageUrl:
      "https://vqzuvjubeohfsixguzpa.supabase.co/storage/v1/object/public/product-uploads/products/800dc521-e755-41d5-b28e-b4fc8c85073c/images/main-8e878418-acb6-40a7-b8fb-af25fbd426aa.png",
  },
  {
    slug: "external-gear-pumps",
    name: "External Gear Pumps",
    parent: "pumps-manufactured-by-us",
    level: 1,
    description: "Robust gear pumps for clean lubricating fluids and hydraulic transfer duties.",
    categoryImageUrl: null,
  },
  {
    slug: "external-lobe-pumps",
    name: "External Lobe Pumps",
    parent: "pumps-manufactured-by-us",
    level: 1,
    description: "Gentle, non-contacting lobe pumps for hygienic and viscous products.",
    categoryImageUrl: null,
  },
  {
    slug: "internal-lobe-pumps",
    name: "Internal Lobe Pumps",
    parent: "pumps-manufactured-by-us",
    level: 1,
    description: "Internal lobe pumps for gentle transfer of viscous and shear-sensitive products.",
    categoryImageUrl: null,
  },
  {
    slug: "internal-gear-pumps",
    name: "Internal Gear Pumps",
    parent: "pumps-manufactured-by-us",
    level: 1,
    description: "Quiet, compact gear pumps for lubricating and process fluids.",
    categoryImageUrl: null,
  },
  {
    slug: "sectional-pumps",
    name: "Sectional Pumps",
    parent: "pumps-manufactured-by-us",
    level: 1,
    description: "Modular sectional pumps for industrial transfer applications.",
    categoryImageUrl: null,
  },
  {
    slug: "shuttle-block-pumps",
    name: "Shuttle Block Pumps",
    parent: "pumps-manufactured-by-us",
    level: 1,
    description: "Low-shear shuttle block pumps for smooth transfer of viscous media.",
    categoryImageUrl: null,
  },
  {
    slug: "progressive-cavity-pumps",
    name: "Progressive Cavity Pumps",
    parent: "pumps-manufactured-by-us",
    level: 1,
    description: "Helical rotor/stator pumps for viscous, abrasive and shear-sensitive fluids.",
    categoryImageUrl: null,
  },
  {
    slug: "triple-screw-pumps",
    name: "Triple Screw Pumps",
    parent: "pumps-manufactured-by-us",
    level: 1,
    description: "Quiet, pulsation-free screw pumps for oil, hydraulic and fuel duties.",
    categoryImageUrl: null,
  },
  {
    slug: "twin-screw-pumps",
    name: "Twin Screw Pumps",
    parent: "pumps-manufactured-by-us",
    level: 1,
    description: "High-capacity, low-shear pumps for viscous and multiphase liquids.",
    categoryImageUrl: null,
  },
  {
    slug: "gerotor-pumps",
    name: "Gerotor Pumps",
    parent: "pumps-manufactured-by-us",
    level: 1,
    description: "Compact gerotor pumps for lubrication and hydraulic systems.",
    categoryImageUrl: null,
  },
  {
    slug: "trochoidal-gear-pumps",
    name: "Trochoidal Gear Pumps",
    parent: "pumps-manufactured-by-us",
    level: 1,
    description: "Smooth, low-pulsation trochoidal pumps for lubrication duties.",
    categoryImageUrl: null,
  },
  {
    slug: "seim-pumps-series",
    name: "SEIM Pumps Series",
    parent: "pumps-traded-by-us",
    level: 1,
    description: "SEIM series pumps and associated traded equipment.",
    categoryImageUrl: null,
  },
];

export async function seedPumpsquareCategories(client) {
  const ids = new Map();

  for (const [index, category] of PUMPSQUARE_CATEGORIES.entries()) {
    const parentId = category.parent ? ids.get(category.parent) ?? null : null;
    await client.query(
      `insert into product_categories (
         id, name, slug, sort_order, parent_id, level, main_category_id,
         description, is_active, category_image_url, updated_at
       )
       values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, $8, now())
       on conflict (slug) do nothing`,
      [
        category.name,
        category.slug,
        index,
        parentId,
        category.level,
        category.level === 1 ? parentId : null,
        category.description,
        category.categoryImageUrl,
      ],
    );

    const { rows } = await client.query("select id from product_categories where slug = $1", [category.slug]);
    ids.set(category.slug, rows[0].id);
  }

  return ids;
}
