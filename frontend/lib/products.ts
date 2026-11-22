export const REVIEW_TABS = [
  { key: "series", label: "Series", defaultHeading: "Series Features" },
  { key: "operational", label: "Operational", defaultHeading: "Operational Features" },
  { key: "installation", label: "Installation", defaultHeading: "Installation Features" },
  { key: "advantages", label: "Advantages", defaultHeading: "Product Advantages" },
  { key: "industry", label: "Industry", defaultHeading: "Industries Served" },
  { key: "sector", label: "Sector", defaultHeading: "Applicable Sectors" },
  { key: "application", label: "Application", defaultHeading: "Applications" },
  { key: "measures", label: "Measures", defaultHeading: "Measurements" },
] as const;

export type ReviewTabKey = (typeof REVIEW_TABS)[number]["key"];

export type ReviewFeature = { label?: string; text: string };

export type ReviewTab = {
  /** Stable identifier; survives renames. Standard keys come from REVIEW_TABS. */
  key: string;
  /** Displayed tab name. */
  label?: string;
  /** True for administrator-created tabs (false/absent for the eight standard tabs). */
  isCustom?: boolean;
  /** Saved display position; the array order is authoritative when saving. */
  sortOrder?: number;
  enabled: boolean;
  heading: string;
  /** Sanitised HTML: paragraphs, bold, italic and basic lists. */
  intro: string;
  features: ReviewFeature[];
};

export type PerformanceColumn = { id: string; name: string; unit: string };
export type PerformanceRow = { id: string; cells: Record<string, string> };

export type MaterialRow = { id: string; component: string; material: string; specification: string };

export type PerformanceMetric = {
  id: string;
  productId: string;
  metricName: string;
  metricValue: string;
  unit: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TechnicalContent = {
  tabs: ReviewTab[];
  performance: { columns: PerformanceColumn[]; rows: PerformanceRow[] };
  materials: MaterialRow[];
  paragraphs: { id: string; html: string }[];
  performanceMetrics?: PerformanceMetric[];
};

export type ProductDetail = {
  slug: string;
  name: string;
  category: { slug: string; name: string } | null;
  summary: string;
  description: string;
  image: string | null;
  galleryImages?: string[];
  series: string[];
  features: string[];
  applications: string[];
  // Each value is [displayValue] or [displayValue, unit].
  specifications: Record<string, string[]>;
  materials: Record<string, string>;
  datasheetUrl: string | null;
  datasheetName: string | null;
  catalogueUrl?: string | null;
  catalogueName?: string | null;
  catalogueAvailable?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  updatedAt: string;
  imageStoragePath?: string | null;
  galleryStoragePaths?: string[];
  catalogueStoragePath?: string | null;
  datasheetStoragePath?: string | null;
  modelUrl?: string | null;
  modelStoragePath?: string | null;
  modelName?: string | null;
  technical?: TechnicalContent;
};

export type ProductCategory = {
  slug: string;
  name: string;
};

export type ProductSummary = {
  slug: string;
  name: string;
  image: string | null;
  summary?: string;
  category: { slug: string; name: string } | null;
  displayOrder?: number;
  /** Set while browsing as a signed-in admin, so drafts can be previewed. */
  status?: "draft" | "published";
};

export type AdminProductStatus = "draft" | "published";

export type AdminProductSummary = ProductSummary & {
  id: string;
  status: AdminProductStatus;
  displayOrder: number;
  updatedAt: string;
};

export type AdminProduct = ProductDetail & {
  id: string;
  status: AdminProductStatus;
  displayOrder: number;
  createdAt: string;
  categoryId: string | null;
  technical: TechnicalContent;
  modelUrl?: string | null;
  modelStoragePath?: string | null;
  modelName?: string | null;
};

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  productCount: number;
  childIds?: string[];
  level?: number;
  mainCategoryId?: string | null;
  content?: string;
  howItWorks?: string;
  applications?: string;
  usageInfo?: string;
  industries?: string;
  additionalInfo?: string;
  categoryImageUrl?: string;
  categoryImageStoragePath?: string;
};

export type PublicCategory = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  level?: number;
  mainCategoryId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  description?: string;
  content?: string;
  howItWorks?: string;
  applications?: string;
  usageInfo?: string;
  industries?: string;
  additionalInfo?: string;
  categoryImageUrl?: string;
};

const productsBySlug: Record<string, ProductDetail> = {
  "progressive-cavity-pumps": {
    slug: "progressive-cavity-pumps",
    name: "Progressive Cavity Pumps",
    category: { slug: "industrial-pumps", name: "Industrial Pumps" },
    summary:
      "Helical rotor-and-stator positive displacement pumps for viscous, abrasive and shear-sensitive fluids.",
    description: "Progressive cavity pumps are positive displacement pumps that use a helical rotor and a double-threaded helical stator to create a continuous flow. These pumps are ideal for handling viscous, abrasive, and shear-sensitive fluids.",
    image: "/images/products/progressive_cavity_pumps_small.jpg",
    series: ["Standard Series", "Heavy Duty Series", "Sanitary Series"],
    features: [
      "Smooth, pulsation-free flow",
      "Self-priming capability",
      "Handles viscous and abrasive fluids",
      "Low shear rate for sensitive products",
      "Reversible flow direction",
      "Compact design with high efficiency"
    ],
    applications: [
      "Wastewater treatment",
      "Chemical processing",
      "Food and beverage",
      "Oil and gas",
      "Paper and pulp",
      "Ceramics and mining"
    ],
    specifications: {
      "Capacity": ["Up to 500 m³/hr"],
      "Pressure": ["Up to 48 bar"],
      "Temperature": ["-20°C to 150°C"],
      "Viscosity": ["Up to 1,000,000 cSt"],
      "Sizes": ["25mm to 300mm"],
      "Drive": ["Direct coupled, belt drive, VFD"]
    },
    materials: {
      "Stator": "Natural rubber, NBR, EPDM, Viton, PTFE",
      "Rotor": "Chrome plated steel, Stainless steel 316, Hardened tool steel",
      "Body": "Cast iron, Stainless steel 316, Alloy steel"
    },
    datasheetUrl: "/catalogues/progressive-cavity-pumps.pdf",
    datasheetName: "Progressive Cavity Pumps Datasheet",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  "triple-screw-pumps": {
    slug: "triple-screw-pumps",
    name: "Triple Screw Pumps",
    category: { slug: "industrial-pumps", name: "Industrial Pumps" },
    summary:
      "Quiet, pulsation-free screw pumps for lubricating oil, hydraulic and fuel duties.",
    description: "Triple screw pumps are high-performance positive displacement pumps with three intermeshing screws. They provide smooth, pulsation-free flow and are ideal for lubricating oil, hydraulic, and fuel applications.",
    image: "/images/products/triple_screw_pumps_small.jpg",
    series: ["Low Pressure Series", "Medium Pressure Series", "High Pressure Series"],
    features: [
      "Extremely low noise and vibration",
      "High efficiency across wide operating range",
      "Pulsation-free continuous flow",
      "Self-lubricating screw design",
      "Bidirectional operation capability"
    ],
    applications: [
      "Lubricating oil circulation",
      "Hydraulic systems",
      "Fuel oil transfer",
      "Marine engine lubrication",
      "Power generation"
    ],
    specifications: {
      "Capacity": ["Up to 300 m³/hr"],
      "Pressure": ["Up to 100 bar"],
      "Temperature": ["Up to 150°C"],
      "Viscosity": ["1 to 10,000 cSt"],
      "Sizes": ["40mm to 250mm"],
      "Drive": ["Direct coupled, VFD"]
    },
    materials: {
      "Screws": "Hardened alloy steel, Nitrided steel",
      "Casing": "Cast iron, Stainless steel 316",
      "Shaft seal": "Mechanical seal, Lip seal"
    },
    datasheetUrl: "/catalogues/triple-screw-pumps.pdf",
    datasheetName: "Triple Screw Pumps Datasheet",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  "external-gear-pumps": {
    slug: "external-gear-pumps",
    name: "External Gear Pumps",
    category: { slug: "industrial-pumps", name: "Industrial Pumps" },
    summary:
      "Robust external gear pumps for clean lubricating fluids and hydraulic transfers.",
    description: "External gear pumps use two intermeshing gears to move fluid in a positive displacement manner. They are robust, compact, and well suited to clean lubricating fluids and hydraulic applications.",
    image: "/images/products/external_gear_pumps_small.jpg",
    series: ["Standard Series", "High Pressure Series"],
    features: [
      "Simple two-gear construction",
      "Compact footprint",
      "Good volumetric efficiency",
      "Handles high pressures",
      "Easy maintenance"
    ],
    applications: [
      "Hydraulic power packs",
      "Lubrication systems",
      "Fuel transfer",
      "Chemical dosing of clean fluids"
    ],
    specifications: {
      "Capacity": ["Up to 150 m³/hr"],
      "Pressure": ["Up to 250 bar"],
      "Temperature": ["Up to 120°C"],
      "Viscosity": ["1 to 20,000 cSt"],
      "Sizes": ["10mm to 100mm"],
      "Drive": ["Direct coupled, VFD"]
    },
    materials: {
      "Gears": "Hardened alloy steel",
      "Casing": "Cast iron, Aluminum, Stainless steel",
      "Shaft seal": "Mechanical seal, Lip seal"
    },
    datasheetUrl: "/catalogues/external-gear-pumps.pdf",
    datasheetName: "External Gear Pumps Datasheet",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  "twin-screw-pumps": {
    slug: "twin-screw-pumps",
    name: "Twin Screw Pumps",
    category: { slug: "industrial-pumps", name: "Industrial Pumps" },
    summary:
      "High-capacity, low-shear twin screw pumps for viscous liquids and multiphase duties.",
    description: "Twin screw pumps are positive displacement pumps using two non-contacting screws. They handle high flow rates, viscous liquids and shear-sensitive fluids with low pulsation and excellent suction performance.",
    image: "/images/products/twin_screw_pumps_small.jpg",
    series: ["Non-Contacting Series", "Contacting Series", "Multiphase Series"],
    features: [
      "Excellent suction lift capability",
      "Low shear and gentle handling",
      "High flow at moderate pressures",
      "Handles solids-laden and viscous media"
    ],
    applications: [
      "Crude oil and multiphase transport",
      "Chemical processing",
      "Food and pharmaceutical",
      "Marine and shipboard transfer"
    ],
    specifications: {
      "Capacity": ["Up to 1,500 m³/hr"],
      "Pressure": ["Up to 40 bar"],
      "Temperature": ["Up to 250°C"],
      "Viscosity": ["Up to 100,000 cSt"],
      "Sizes": ["50mm to 600mm"],
      "Drive": ["Direct coupled, gearbox, VFD"]
    },
    materials: {
      "Screws": "Stainless steel 316, Duplex steel",
      "Casing": "Cast iron, Stainless steel, Duplex",
      "Timing gears": "Hardened alloy steel"
    },
    datasheetUrl: "/catalogues/twin-screw-pumps.pdf",
    datasheetName: "Twin Screw Pumps Datasheet",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  "internal-gear-pumps": {
    slug: "internal-gear-pumps",
    name: "Internal Gear Pumps",
    category: { slug: "industrial-pumps", name: "Industrial Pumps" },
    summary:
      "Compact, quiet internal gear pumps for lubricating and process fluids.",
    description: "Internal gear pumps use an inner driving gear meshing with an outer ring gear to displace fluid. Their gentle action and compact form suit lubricating and process fluids.",
    image: "/images/products/internal_gear_pumps_small.jpg",
    series: ["Standard Series", "Sanitary Series"],
    features: [
      "Low noise and long service life",
      "Good handling of viscous liquids",
      "Self-priming",
      "Compact design"
    ],
    applications: [
      "Lubrication and oil circulation",
      "Chemical and petrochemical transfer",
      "Food processing",
      "Marine engines"
    ],
    specifications: {
      "Capacity": ["Up to 200 m³/hr"],
      "Pressure": ["Up to 16 bar"],
      "Temperature": ["Up to 200°C"],
      "Viscosity": ["Up to 200,000 cSt"],
      "Sizes": ["25mm to 200mm"],
      "Drive": ["Direct coupled, VFD"]
    },
    materials: {
      "Gears": "Hardened alloy steel, Stainless steel",
      "Casing": "Cast iron, Stainless steel 316",
      "Shaft seal": "Mechanical seal, Lip seal"
    },
    datasheetUrl: "/catalogues/internal-gear-pumps.pdf",
    datasheetName: "Internal Gear Pumps Datasheet",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  "gerotor-pumps": {
    slug: "gerotor-pumps",
    name: "Gerotor Pumps",
    category: { slug: "industrial-pumps", name: "Industrial Pumps" },
    summary:
      "Compact gerotor pumps for lubrication, hydraulics and small dosing duties.",
    description: "Gerotor pumps use an inner rotor with one fewer tooth than the outer rotor to move fluid smoothly. They are compact, quiet and suited to lubrication and hydraulic duties.",
    image: "/images/products/gerotor_pumps_small.jpg",
    series: ["Standard Series"],
    features: [
      "Smooth, low-pulsation flow",
      "Compact and lightweight",
      "Low noise",
      "Cost-effective design"
    ],
    applications: [
      "Engine lubrication",
      "Hydraulic systems",
      "Oil transfer",
      "Small transfer duties"
    ],
    specifications: {
      "Capacity": ["Up to 60 m³/hr"],
      "Pressure": ["Up to 20 bar"],
      "Temperature": ["Up to 120°C"],
      "Viscosity": ["Up to 50,000 cSt"],
      "Sizes": ["10mm to 80mm"],
      "Drive": ["Direct coupled, VFD"]
    },
    materials: {
      "Rotors": "Powder metallurgy, Hardened steel",
      "Casing": "Cast iron, Aluminum",
      "Shaft seal": "Lip seal, Mechanical seal"
    },
    datasheetUrl: "/catalogues/gerotor-pumps.pdf",
    datasheetName: "Gerotor Pumps Datasheet",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  "trochoidal-gear-pumps": {
    slug: "trochoidal-gear-pumps",
    name: "Trochoidal Gear Pumps",
    category: { slug: "industrial-pumps", name: "Industrial Pumps" },
    summary:
      "Trochoidal gear pumps delivering smooth, pulse-free flow for lubrication duties.",
    description: "Trochoidal gear pumps use a trochoidal rotor set to deliver a steady flow. They provide low pulsation, compact dimensions and reliable performance for lubrication and transfer duties.",
    image: "/images/products/trochoidal_gear_pumps_small.jpg",
    series: ["Standard Series"],
    features: [
      "Pulse-free discharge",
      "Compact construction",
      "Low wear between rotors",
      "Easy installation"
    ],
    applications: [
      "Lubricating oil systems",
      "Hydraulic circuits",
      "Fuel transfer"
    ],
    specifications: {
      "Capacity": ["Up to 80 m³/hr"],
      "Pressure": ["Up to 25 bar"],
      "Temperature": ["Up to 120°C"],
      "Viscosity": ["Up to 40,000 cSt"],
      "Sizes": ["12mm to 90mm"],
      "Drive": ["Direct coupled, VFD"]
    },
    materials: {
      "Rotors": "Hardened steel",
      "Casing": "Cast iron, Aluminum",
      "Shaft seal": "Lip seal"
    },
    datasheetUrl: "/catalogues/trochoidal-gear-pumps.pdf",
    datasheetName: "Trochoidal Gear Pumps Datasheet",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  "shuttle-block-pumps": {
    slug: "shuttle-block-pumps",
    name: "Shuttle Block Pumps",
    category: { slug: "industrial-pumps", name: "Industrial Pumps" },
    summary:
      "Shuttle block pumps for smooth, low-shear transfer of viscous products.",
    description: "Shuttle block pumps use a rotating block and shuttle arrangement to deliver a gentle, pulse-free flow, making them suitable for viscous and shear-sensitive products.",
    image: "/images/products/shuttle_block_pumps_small.jpg",
    series: ["Standard Series"],
    features: [
      "Gentle, low-shear handling",
      "Smooth discharge",
      "Self-priming",
      "Handles viscous media"
    ],
    applications: [
      "Food processing",
      "Paint and resin transfer",
      "Chemical processing"
    ],
    specifications: {
      "Capacity": ["Up to 120 m³/hr"],
      "Pressure": ["Up to 12 bar"],
      "Temperature": ["Up to 120°C"],
      "Viscosity": ["Up to 150,000 cSt"],
      "Sizes": ["25mm to 150mm"],
      "Drive": ["Direct coupled, VFD"]
    },
    materials: {
      "Block and shuttle": "Hardened alloy steel",
      "Casing": "Cast iron, Stainless steel",
      "Shaft seal": "Mechanical seal"
    },
    datasheetUrl: "/catalogues/shuttle-block-pumps.pdf",
    datasheetName: "Shuttle Block Pumps Datasheet",
    updatedAt: "2026-01-01T00:00:00.000Z"
  },
  "external-lobe-pumps": {
    slug: "external-lobe-pumps",
    name: "External Lobe Pumps",
    category: { slug: "industrial-pumps", name: "Industrial Pumps" },
    summary:
      "Non-contacting lobe pumps for hygienic, solids-tolerant and viscous fluids.",
    description: "External lobe pumps use two non-contacting rotary lobes to move product gently. With a CIP-friendly design, they are well suited to food, pharmaceutical and viscous process duties.",
    image: "/images/products/external_lobe_pumps_small.jpg",
    series: ["Sanitary Series", "Industrial Series"],
    features: [
      "Gentle, low-shear pumping",
      "Handles solids and viscous products",
      "CIP and SIP capable",
      "Excellent suction performance"
    ],
    applications: [
      "Food and beverage",
      "Pharmaceutical",
      "Cosmetics",
      "Chemical and pulp transfer"
    ],
    specifications: {
      "Capacity": ["Up to 500 m³/hr"],
      "Pressure": ["Up to 16 bar"],
      "Temperature": ["Up to 180°C"],
      "Viscosity": ["Up to 200,000 cSt"],
      "Sizes": ["25mm to 250mm"],
      "Drive": ["Direct coupled, gearbox, VFD"]
    },
    materials: {
      "Lobes": "Stainless steel 316L, Nitrile, EPDM",
      "Casing": "Stainless steel 316L",
      "Shaft seal": "Mechanical seal, O-ring"
    },
    datasheetUrl: "/catalogues/external-lobe-pumps.pdf",
    datasheetName: "External Lobe Pumps Datasheet",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
};

export const seedCategories: ProductCategory[] = [
  { slug: "industrial-pumps", name: "Industrial Pumps" },
  { slug: "marine-pumps", name: "Marine Pumps" },
  { slug: "relief-valves", name: "Relief Valves" },
  { slug: "pump-consultation", name: "Pump Consultation" },
];

export const seedProducts: ProductDetail[] = Object.values(productsBySlug);
