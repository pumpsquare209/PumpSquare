"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
  Box,
} from "lucide-react";
import type { AdminCategory, AdminProductStatus, TechnicalContent } from "@/lib/products";
import { slugify } from "@/lib/slugify";
import { fileProxyUrl } from "@/lib/upload-url";
import { cn } from "@/lib/utils";
import ReviewTabsEditor from "./ReviewTabsEditor";
import PerformanceTableEditor from "./PerformanceTableEditor";
import MaterialsTableEditor from "./MaterialsTableEditor";
import ExplanationEditor from "./ExplanationEditor";
import { isTabLive, normalizeTechnical, toPayload, type EditorTechnical } from "./editor-types";

/** Blocks saves that the technical tab editor could not have produced. */
function technicalTabProblem(technical: EditorTechnical): string | null {
  const names = new Map<string, string>();
  for (const tab of technical.tabs) {
    const name = tab.label.trim();
    if (!name) return "Every technical tab needs a name.";
    const key = name.toLowerCase();
    if (names.has(key)) return `Two technical tabs are named "${name}". Tab names must be unique.`;
    names.set(key, name);
    if (tab.enabled && !isTabLive(tab)) {
      return `The "${name}" tab is set to show but has no content. Add a heading, bullet point or description, or untick "Show this tab on the website".`;
    }
  }
  return null;
}

type SpecRow = { key: string; value: string; unit: string };
type Pair = { key: string; value: string };

export type EditorProduct = {
  id: string;
  slug: string;
  name: string;
  categoryId: string | null;
  mainCategoryId: string | null;
  productTypeCategoryId: string | null;
  status: AdminProductStatus;
  summary: string;
  description: string;
  imageUrl: string | null;
  galleryImages: string[];
  datasheetUrl: string | null;
  datasheetName: string | null;
  catalogueUrl: string | null;
  catalogueName: string | null;
  modelUrl: string | null;
  modelName: string | null;
  series: string[];
  features: string[];
  applications: string[];
  specifications: Record<string, string[]>;
  materials: Record<string, string | string[]>;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  imageStoragePath?: string | null;
  galleryStoragePaths?: string[];
  catalogueStoragePath?: string | null;
  datasheetStoragePath?: string | null;
  modelStoragePath?: string | null;
  technical?: TechnicalContent;
};

type UploadKind = "image" | "document" | "model";
type UploadSlot = "main" | "gallery" | "catalogue" | "datasheet" | "model";

type UploadResult = { url: string; path?: string; name?: string };

type UploadState = {
  progress: number;
  label: string;
  slot: string;
};

const EMPTY: EditorProduct = {
  id: "",
  slug: "",
  name: "",
  categoryId: null,
  mainCategoryId: null,
  productTypeCategoryId: null,
  status: "draft",
  summary: "",
  description: "",
  imageUrl: null,
  galleryImages: [],
  datasheetUrl: null,
  datasheetName: null,
  catalogueUrl: null,
  catalogueName: null,
  modelUrl: null,
  modelName: null,
  series: [],
  features: [],
  applications: [],
  specifications: {},
  materials: {},
  seoTitle: null,
  seoDescription: null,
  displayOrder: 0,
  imageStoragePath: null,
  galleryStoragePaths: [],
  catalogueStoragePath: null,
  datasheetStoragePath: null,
  modelStoragePath: null,
};

const ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_MODELS = ["model/gltf-binary", "application/octet-stream", ""];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_MODEL_BYTES = 25 * 1024 * 1024;

function toSpecRows(record: Record<string, string[]>): SpecRow[] {
  return Object.entries(record).map(([key, values]) => ({
    key,
    value: values[0] ?? "",
    unit: values[1] ?? "",
  }));
}

function toPairs(record: Record<string, string | string[]>): Pair[] {
  return Object.entries(record).map(([key, value]) => ({
    key,
    value: Array.isArray(value) ? value.join(", ") : value,
  }));
}

function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

const input =
  "mt-1.5 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";

/** Get main categories (level 0) */
function getMainCategories(categories: AdminCategory[]): AdminCategory[] {
  return categories
    .filter((c) => c.level === 0 && c.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
}

/** Get product-type categories (level 1) for a given main category */
function getProductTypeCategories(categories: AdminCategory[], mainCategoryId: string | null): AdminCategory[] {
  if (!mainCategoryId) return [];
  return categories
    .filter((c) => c.level === 1 && c.mainCategoryId === mainCategoryId && c.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
}

export default function ProductEditor({
  categories,
  categoriesError = null,
  product,
}: {
  categories: AdminCategory[];
  categoriesError?: string | null;
  product?: EditorProduct;
}) {
  const router = useRouter();
  const isNew = !product;
  const start = product ?? EMPTY;

  const [name, setName] = useState(start.name);
  const [slug, setSlug] = useState(start.slug);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  // New category selection state
  const [mainCategoryId, setMainCategoryId] = useState(start.mainCategoryId ?? "");
  const [productTypeCategoryId, setProductTypeCategoryId] = useState(start.productTypeCategoryId ?? "");

  // Derived categoryId for backward compatibility
  const categoryId = productTypeCategoryId;

  const mainCategories = getMainCategories(categories);
  const productTypeCategories = getProductTypeCategories(categories, mainCategoryId);

  const selectedMainCategory = categories.find((c) => c.id === mainCategoryId);
  const selectedProductTypeCategory = categories.find((c) => c.id === productTypeCategoryId);
  const categoryActive = !selectedProductTypeCategory || selectedProductTypeCategory.isActive !== false;
  const inactiveCategory = selectedProductTypeCategory && selectedProductTypeCategory.isActive === false ? selectedProductTypeCategory : null;

  const [summary, setSummary] = useState(start.summary);
  const [description, setDescription] = useState(start.description);
  const [displayOrder, setDisplayOrder] = useState(String(start.displayOrder ?? 0));
  const [imageUrl, setImageUrl] = useState(start.imageUrl);
  const [galleryImages, setGalleryImages] = useState<string[]>(start.galleryImages);
  const [datasheetUrl, setDatasheetUrl] = useState(start.datasheetUrl);
  const [datasheetName, setDatasheetName] = useState(start.datasheetName);
  const [catalogueUrl, setCatalogueUrl] = useState(start.catalogueUrl);
  const [catalogueName, setCatalogueName] = useState(start.catalogueName);
  const [modelUrl, setModelUrl] = useState(start.modelUrl);
  const [modelName, setModelName] = useState(start.modelName);
  const [series, setSeries] = useState(start.series.join("\n"));
  const [features, setFeatures] = useState(start.features.join("\n"));
  const [applications, setApplications] = useState(start.applications.join("\n"));
  const [specifications, setSpecifications] = useState<SpecRow[]>(toSpecRows(start.specifications));
  const [materials, setMaterials] = useState<Pair[]>(toPairs(start.materials));
  const [seoTitle, setSeoTitle] = useState(start.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(start.seoDescription ?? "");
  const [technical, setTechnical] = useState<EditorTechnical>(() => normalizeTechnical(start.technical));
  const [imagePath, setImagePath] = useState<string | null>(start.imageStoragePath ?? null);
  const [galleryPaths, setGalleryPaths] = useState<(string | null)[]>(start.galleryStoragePaths ?? []);
  const [cataloguePath, setCataloguePath] = useState<string | null>(start.catalogueStoragePath ?? null);
  const [datasheetPath, setDatasheetPath] = useState<string | null>(start.datasheetStoragePath ?? null);
  const [modelPath, setModelPath] = useState<string | null>(start.modelStoragePath ?? null);

  const productId = start.id;

  const [upload, setUpload] = useState<UploadState | null>(null);
  const [saving, setSaving] = useState<AdminProductStatus | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const datasheetInput = useRef<HTMLInputElement>(null);
  const catalogueInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);

  const busy = saving !== null || upload !== null;
  const uploadsLocked = busy || !productId;

  function handleName(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function validateImage(file: File): string | null {
    if (!ACCEPTED_IMAGES.includes(file.type)) return "Only JPG, PNG or WebP images can be uploaded.";
    if (file.size > MAX_IMAGE_BYTES) return "Images must be 5 MB or smaller.";
    return null;
  }

  function validatePdf(file: File): string | null {
    if (file.type !== "application/pdf") return "Only PDF documents can be uploaded.";
    if (file.size > MAX_PDF_BYTES) return "PDFs must be 10 MB or smaller.";
    return null;
  }

  function validateModel(file: File): string | null {
    if (!file.name.toLowerCase().endsWith(".glb") || !ACCEPTED_MODELS.includes(file.type)) return "Only GLB 3D models can be uploaded.";
    if (file.size > MAX_MODEL_BYTES) return "GLB models must be 25 MB or smaller.";
    return null;
  }

  function uploadFile(kind: UploadKind, file: File, slot: UploadSlot): Promise<UploadResult | null> {
    if (!productId) {
      setMessage({ type: "error", text: "Save this product as a draft before uploading files." });
      return Promise.resolve(null);
    }
    const invalid =
      kind === "image"
        ? validateImage(file)
        : kind === "document"
        ? validatePdf(file)
        : validateModel(file);
    if (invalid) {
      setMessage({ type: "error", text: invalid });
      return Promise.resolve(null);
    }

    setMessage(null);
    const label =
      kind === "image"
        ? "Uploading image"
        : kind === "document"
        ? "Uploading PDF"
        : "Uploading 3D model";
    setUpload({ progress: 0, label, slot });

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        
        const request = new XMLHttpRequest();
        request.open("POST", "/api/admin/uploads");
        request.setRequestHeader("Content-Type", "application/json");
        request.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          setUpload({ progress: Math.round((event.loaded / event.total) * 100), label, slot });
        };
        request.onload = () => {
          setUpload(null);
          try {
            const data = JSON.parse(request.responseText) as { ok: boolean; url?: string; path?: string; name?: string; message?: string };
            if (request.status >= 400 || !data.ok || !data.url) throw new Error(data.message ?? "Upload failed.");
            resolve({ url: data.url, path: data.path, name: data.name });
          } catch (caught) {
            setMessage({ type: "error", text: caught instanceof Error ? caught.message : "Upload failed." });
            resolve(null);
          }
        };
        request.onerror = () => {
          setUpload(null);
          setMessage({ type: "error", text: "Upload failed. Check your connection and try again." });
          resolve(null);
        };
        request.send(JSON.stringify({
          kind,
          slot,
          productId,
          name: file.name,
          file: base64,
        }));
      };
      reader.onerror = () => {
        setUpload(null);
        setMessage({ type: "error", text: "Failed to read file." });
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }

  async function setMainImage(file: File) {
    const result = await uploadFile("image", file, "main");
    if (result) {
      setImageUrl(result.url);
      setImagePath(result.path ?? null);
    }
  }

  async function addGalleryImage(file: File) {
    const result = await uploadFile("image", file, "gallery");
    if (result) {
      setGalleryImages((current) => [...current, result.url]);
      setGalleryPaths((current) => [...current, result.path ?? null]);
    }
  }

  async function replaceGalleryImage(index: number, file: File) {
    const result = await uploadFile("image", file, "gallery");
    if (result) {
      setGalleryImages((current) => current.map((item, i) => (i === index ? result.url : item)));
      setGalleryPaths((current) => current.map((item, i) => (i === index ? result.path ?? null : item)));
    }
  }

  async function setModel(file: File) {
    const result = await uploadFile("model", file, "model");
    if (result) {
      setModelUrl(result.url);
      setModelName(result.name ?? file.name);
      setModelPath(result.path ?? null);
    }
  }

  function moveGallery(index: number, direction: -1 | 1) {
    setGalleryImages((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setGalleryPaths((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeGallery(index: number) {
    setGalleryImages((current) => current.filter((_, i) => i !== index));
    setGalleryPaths((current) => current.filter((_, i) => i !== index));
  }

  function missingForPublish(): string[] {
    const missing: string[] = [];
    if (name.trim().length < 2) missing.push("Product name");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) missing.push("Valid URL slug");
    if (!productTypeCategoryId) missing.push("Product-Type Category");
    else if (!categoryActive) missing.push("Active category (the selected one is deactivated)");
    if (!summary.trim()) missing.push("Short description");
    if (!imageUrl) missing.push("Main image");
    return missing;
  }

  function technicalSummary() {
    const payload = toPayload(technical);
    const visibleTabs = technical.tabs.filter(isTabLive).length;
    const bullets = payload.tabs.reduce((total, tab) => total + tab.features.length, 0);
    return { tabs: visibleTabs, bullets, columns: payload.performance.columns.length, rows: payload.performance.rows.length, materials: payload.materials.length, paragraphs: payload.paragraphs.length };
  }

  async function save(status: AdminProductStatus) {
    if (saving) return;
    setMessage(null);

    if (categoriesError) {
      setMessage({ type: "error", text: "Categories could not be loaded, so this product cannot be saved. Reload the page and try again." });
      return;
    }

    if (status === "published") {
      const missing = missingForPublish();
      if (missing.length) {
        setMessage({ type: "error", text: `Cannot publish yet. Add: ${missing.join(", ")}.` });
        return;
      }
    }

    const tabProblem = technicalTabProblem(technical);
    if (tabProblem) {
      setMessage({ type: "error", text: tabProblem });
      return;
    }

    setSaving(status);
    const order = Number.parseInt(displayOrder, 10);
    const alignedGalleryPaths = galleryImages.every((_, index) => Boolean(galleryPaths[index]))
      ? galleryImages.map((_, index) => galleryPaths[index] as string)
      : [];

    const body = {
      name: name.trim(),
      slug,
      categoryId: categoryId || null,
      mainCategoryId: mainCategoryId || null,
      productTypeCategoryId: productTypeCategoryId || null,
      summary: summary.trim(),
      description: description.trim(),
      imageUrl,
      galleryImages,
      datasheetUrl,
      datasheetName: datasheetUrl ? datasheetName : null,
      catalogueUrl,
      catalogueName: catalogueUrl ? catalogueName : null,
      modelUrl,
      modelName: modelUrl ? modelName : null,
      series: lines(series),
      features: lines(features),
      applications: lines(applications),
      specifications: specifications
        .filter((row) => row.key.trim() && row.value.trim())
        .map((row) => ({ key: row.key.trim(), value: row.value.trim(), ...(row.unit.trim() ? { unit: row.unit.trim() } : {}) })),
      materials: materials.filter((pair) => pair.key.trim() && pair.value.trim()),
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
      displayOrder: Number.isFinite(order) ? Math.max(0, order) : 0,
      status,
      imageStoragePath: imageUrl ? imagePath : null,
      galleryStoragePaths: alignedGalleryPaths,
      catalogueStoragePath: catalogueUrl ? cataloguePath : null,
      datasheetStoragePath: datasheetUrl ? datasheetPath : null,
      modelStoragePath: modelUrl ? modelPath : null,
      technical: toPayload(technical),
    };

    try {
      const response = isNew
        ? await fetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/admin/products/${start.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "update", product: body }),
          });

      const data = (await response.json()) as { ok: boolean; id?: string; message?: string };
      if (!response.ok || !data.ok) throw new Error(data.message ?? "Could not save the product.");

      const id = data.id ?? start.id;
      if (status === "draft" && start.status === "published") {
        setSaving(null);
        setMessage({ type: "success", text: "Saved and unpublished. The product is no longer visible on the public site." });
        router.refresh();
        return;
      }

      const published = status === "published" && (isNew || start.status !== "published");
      setMessage({
        type: "success",
        text: published
          ? "Product published."
          : status === "published"
          ? "Changes saved and published."
          : "Draft saved.",
      });
      if (isNew) router.replace(`/admin/products/${id}/edit`);
      router.refresh();
    } catch (caught) {
      setMessage({ type: "error", text: caught instanceof Error ? caught.message : "Could not save the product." });
      setSaving(null);
    }
  }

  const stats = technicalSummary();
  const previewHref = start.status === "published" ? `/products/${slug}` : null;

  // Reset product type category when main category changes
  useEffect(() => {
    if (mainCategoryId && !productTypeCategories.some((c) => c.id === productTypeCategoryId)) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setProductTypeCategoryId("");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [mainCategoryId, productTypeCategories, productTypeCategoryId]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save(start.status === "published" ? "published" : "draft");
      }}
      className="mt-6 space-y-6"
      noValidate
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-deep">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to products
        </Link>
        <div className="flex items-center gap-2">
          {previewHref ? (
            <a href={previewHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-deep">
              <Eye aria-hidden="true" className="size-4" />
              Preview
            </a>
          ) : null}
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
              start.status === "published" && !isNew
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-amber-200",
            )}
          >
            {start.status === "published" && !isNew ? "Published" : "Draft"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display text-base font-bold text-primary-deep">Product details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="product-name" className="text-sm font-semibold text-ink">
                  Product name <Required />
                </label>
                <input id="product-name" value={name} onChange={(event) => handleName(event.target.value)} maxLength={120} className={input} />
              </div>
              <div>
                <label htmlFor="product-slug" className="text-sm font-semibold text-ink">
                  URL slug <Required />
                </label>
                <input
                  id="product-slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                  maxLength={80}
                  className={input}
                />
                <p className="mt-1 text-xs text-muted">/products/{slug || "..."}</p>
              </div>

              {/* Main Category Dropdown */}
              <div>
                <label htmlFor="main-category" className="text-sm font-semibold text-ink">
                  Main Category <Required />
                </label>
                <select
                  id="main-category"
                  value={mainCategoryId}
                  onChange={(event) => setMainCategoryId(event.target.value)}
                  disabled={!categoriesError && mainCategories.length === 0}
                  aria-invalid={Boolean(categoriesError || (mainCategoryId && !selectedMainCategory?.isActive))}
                  aria-describedby="main-category-help"
                  className={input}
                >
                  <option value="">Select a main category</option>
                  {mainCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <p id="main-category-help" className="mt-1 text-xs">
                  {categoriesError ? (
                    <span className="text-red-600">Categories could not be loaded. Reload the page and try again.</span>
                  ) : mainCategories.length === 0 ? (
                    <span className="text-red-600">No main categories exist yet. Add categories under Categories before saving a product.</span>
                  ) : (
                    <span className="text-muted">Choose &ldquo;Pumps Manufactured by Us&rdquo; or &ldquo;Pumps We Trade&rdquo;.</span>
                  )}
                </p>
              </div>

              {/* Product-Type Category Dropdown */}
              <div>
                <label htmlFor="product-type-category" className="text-sm font-semibold text-ink">
                  Product-Type Category <Required />
                </label>
                <select
                  id="product-type-category"
                  value={productTypeCategoryId}
                  onChange={(event) => setProductTypeCategoryId(event.target.value)}
                  disabled={!categoriesError && productTypeCategories.length === 0}
                  aria-invalid={Boolean(categoriesError || (productTypeCategoryId && !categoryActive))}
                  aria-describedby="product-type-category-help"
                  className={input}
                >
                  <option value="">Select a product type</option>
                  {productTypeCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                  {inactiveCategory ? (
                    <option value={inactiveCategory.id}>
                      {inactiveCategory.name} (inactive)
                    </option>
                  ) : null}
                </select>
                <p id="product-type-category-help" className="mt-1 text-xs">
                  {categoriesError ? (
                    <span className="text-red-600">Categories could not be loaded. Reload the page and try again.</span>
                  ) : !mainCategoryId ? (
                    <span className="text-muted">First select a main category above.</span>
                  ) : productTypeCategories.length === 0 ? (
                    <span className="text-red-600">No product types available for the selected main category. Add product-type categories under Categories.</span>
                  ) : inactiveCategory ? (
                    <span className="text-red-600">This category is inactive. Choose an active category to publish.</span>
                  ) : (
                    <span className="text-muted">Select the specific product type (e.g., External Gear Pumps).</span>
                  )}
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="product-summary" className="text-sm font-semibold text-ink">
                  Short description <Required />
                </label>
                <input id="product-summary" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={300} className={input} />
                <p className="mt-1 text-xs text-muted">Shown on the catalogue card and under the title. {summary.length}/300</p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="product-description" className="text-sm font-semibold text-ink">Detailed description</label>
                <textarea id="product-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={7} maxLength={5000} className={input} />
                <p className="mt-1 text-xs text-muted">Overview on the product page. {description.length}/5000</p>
              </div>
              <div>
                <label htmlFor="product-order" className="text-sm font-semibold text-ink">Display order</label>
                <input
                  id="product-order"
                  type="number"
                  min={0}
                  max={9999}
                  value={displayOrder}
                  onChange={(event) => setDisplayOrder(event.target.value)}
                  className={input}
                />
                <p className="mt-1 text-xs text-muted">Lower numbers appear first in the catalogue.</p>
              </div>
            </div>
          </section>

          <ReviewTabsEditor technical={technical} onChange={setTechnical} />
          <PerformanceTableEditor
            columns={technical.columns}
            rows={technical.rows}
            onColumns={(columns) => setTechnical({ ...technical, columns })}
            onRows={(rows) => setTechnical({ ...technical, rows })}
          />
          <MaterialsTableEditor rows={technical.materials} onChange={(rows) => setTechnical({ ...technical, materials: rows })} />
          <ExplanationEditor paragraphs={technical.paragraphs} onChange={(paragraphs) => setTechnical({ ...technical, paragraphs })} />

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display text-base font-bold text-primary-deep">Series, features & applications</h2>
            <p className="mt-1 text-xs text-muted">
              Quick lists for the catalogue card and product header. One item per line. Leave empty to hide the section.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="product-series" className="text-sm font-semibold text-ink">Available series</label>
                <textarea id="product-series" value={series} onChange={(event) => setSeries(event.target.value)} rows={6} className={input} />
              </div>
              <div>
                <label htmlFor="product-features" className="text-sm font-semibold text-ink">Key features</label>
                <textarea id="product-features" value={features} onChange={(event) => setFeatures(event.target.value)} rows={6} className={input} />
              </div>
              <div>
                <label htmlFor="product-applications" className="text-sm font-semibold text-ink">Applications</label>
                <textarea id="product-applications" value={applications} onChange={(event) => setApplications(event.target.value)} rows={6} className={input} />
              </div>
            </div>
          </section>

          <SpecEditor rows={specifications} onChange={setSpecifications} />
          <PairEditor title="Materials of construction (legacy summary)" labelKey="Component" labelValue="Material" pairs={materials} onChange={setMaterials} />

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display text-base font-bold text-primary-deep">Search engine listing</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="product-seo-title" className="text-sm font-semibold text-ink">SEO title</label>
                <input id="product-seo-title" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} maxLength={70} className={input} placeholder={name} />
                <p className="mt-1 text-xs text-muted">{seoTitle.length}/70 · defaults to the product name.</p>
              </div>
              <div>
                <label htmlFor="product-seo-description" className="text-sm font-semibold text-ink">Meta description</label>
                <textarea id="product-seo-description" value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} rows={3} maxLength={160} className={input} placeholder={summary} />
                <p className="mt-1 text-xs text-muted">{seoDescription.length}/160 · defaults to the short description.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {!productId ? (
            <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-xs font-medium text-primary-deep">
              Save this product as a draft first &mdash; images, PDFs and 3D models are uploaded into the product&rsquo;s own storage folder.
            </p>
          ) : null}
          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display text-base font-bold text-primary-deep">Publishing</h2>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void save("published")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-primary-deep transition-colors hover:bg-accent-dark disabled:opacity-60"
              >
                {saving === "published" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <CheckCircle2 aria-hidden="true" className="size-4" />}
                {start.status === "published" && !isNew ? "Update & publish" : "Publish"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save("draft")}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
              >
                {saving === "draft" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
                {start.status === "published" && !isNew ? "Unpublish (save as draft)" : "Save as draft"}
              </button>
              <Link
                href="/admin"
                className={cn("rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-muted hover:text-ink", busy && "pointer-events-none opacity-50")}
              >
                Cancel
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted">
              Drafts never appear on the public site. Publishing requires a name, category, short description and main image.
            </p>
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display text-base font-bold text-primary-deep">Technical content</h2>
            <dl className="mt-3 space-y-1.5 text-xs">
              <StatRow label="Tabs with content" value={stats.tabs} />
              <StatRow label="Bullet points" value={stats.bullets} />
              <StatRow label="Performance table" value={stats.columns ? `${stats.columns} columns × ${stats.rows} rows` : "Not set"} />
              <StatRow label="Materials rows" value={stats.materials} />
              <StatRow label="Explanation paragraphs" value={stats.paragraphs} />
              <StatRow label="Catalogue PDF" value={catalogueUrl ? "Uploaded" : "Not uploaded"} />
              <StatRow label="Datasheet PDF" value={datasheetUrl ? "Uploaded" : "Not uploaded"} />
              <StatRow label="3D Model" value={modelUrl ? "Uploaded" : "Not uploaded"} />
            </dl>
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display text-base font-bold text-primary-deep">
              Main image <Required />
            </h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-dashed border-line bg-slate-50">
              {imageUrl ? (
                <img src={imageUrl} alt="Main product" className="h-40 w-full object-contain p-2" />
              ) : (
                <div className="grid h-40 place-items-center text-xs text-muted">No image yet</div>
              )}
            </div>
            {upload?.slot === "main" ? <UploadProgress upload={upload} /> : null}
            <input
              ref={imageInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void setMainImage(file);
                event.target.value = "";
              }}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                disabled={uploadsLocked}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-primary/40 hover:text-primary disabled:opacity-60"
              >
                <Upload aria-hidden="true" className="size-3.5" />
                {imageUrl ? "Replace image" : "Upload image"}
              </button>
              {imageUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl(null);
                    setImagePath(null);
                  }}
                  className="rounded-md border border-line p-2 text-muted hover:text-red-600"
                  aria-label="Remove main image"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted">JPG, PNG or WebP up to 5 MB. Shown on the product card and detail page.</p>
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display text-base font-bold text-primary-deep">Additional images</h2>
            {galleryImages.length ? (
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {galleryImages.map((url, index) => (
                  <li key={`${url}-${index}`} className="group relative overflow-hidden rounded-md border border-line bg-slate-50">
                    <img src={url} alt={`Additional image ${index + 1}`} className="h-20 w-full object-contain p-1" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 bg-black/55 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button type="button" onClick={() => moveGallery(index, -1)} disabled={index === 0} className="rounded p-1 text-white disabled:opacity-30" aria-label={`Move image ${index + 1} left`}>
                        <ArrowUp aria-hidden="true" className="size-3 -rotate-90" />
                      </button>
                      <label className="cursor-pointer rounded p-1 text-white hover:text-accent" title={`Replace image ${index + 1}`}>
                        <Upload aria-hidden="true" className="size-3" />
                        <span className="sr-only">Replace image {index + 1}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void replaceGalleryImage(index, file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      <button type="button" onClick={() => moveGallery(index, 1)} disabled={index === galleryImages.length - 1} className="rounded p-1 text-white disabled:opacity-30" aria-label={`Move image ${index + 1} right`}>
                        <ArrowDown aria-hidden="true" className="size-3 -rotate-90" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeGallery(index)}
                        className="rounded p-1 text-white hover:text-red-300"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <X aria-hidden="true" className="size-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted">No additional images.</p>
            )}
            {upload?.slot === "gallery" || upload?.slot?.startsWith("gallery-") ? <UploadProgress upload={upload} /> : null}
            <input
              ref={galleryInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void addGalleryImage(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => galleryInput.current?.click()}
              disabled={uploadsLocked || galleryImages.length >= 10}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-primary/40 hover:text-primary disabled:opacity-60"
            >
              <ImagePlus aria-hidden="true" className="size-3.5" />
              Add image ({galleryImages.length}/10)
            </button>
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="font-display text-base font-bold text-primary-deep">
              3D Model (GLB) <span className="text-xs font-normal text-muted">Optional</span>
            </h2>
            <p className="mt-1 text-xs text-muted">Upload a .glb file for interactive 3D viewing on the product detail page.</p>
            <div className="mt-3 overflow-hidden rounded-lg border border-dashed border-line bg-slate-50">
              {modelUrl ? (
                <div className="h-40 w-full flex items-center justify-center bg-white p-2">
                  <div className="text-center">
                    <Box className="mx-auto size-10 text-primary" aria-hidden="true" />
                    <p className="mt-2 text-sm font-medium text-ink">{modelName}</p>
                    <p className="text-xs text-muted">3D model uploaded</p>
                  </div>
                </div>
              ) : (
                <div className="grid h-40 place-items-center text-xs text-muted">No 3D model uploaded</div>
              )}
            </div>
            {upload?.slot === "model" ? <UploadProgress upload={upload} /> : null}
            <input
              ref={modelInput}
              type="file"
              accept="model/gltf-binary,.glb"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void setModel(file);
                event.target.value = "";
              }}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => modelInput.current?.click()}
                disabled={uploadsLocked}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-primary/40 hover:text-primary disabled:opacity-60"
              >
                <Upload aria-hidden="true" className="size-3.5" />
                {modelUrl ? "Replace model" : "Upload model"}
              </button>
              {modelUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setModelUrl(null);
                    setModelName(null);
                    setModelPath(null);
                  }}
                  className="rounded-md border border-line p-2 text-muted hover:text-red-600"
                  aria-label="Remove 3D model"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted">GLB format up to 25 MB. Enables interactive 3D viewer on product page.</p>
          </section>

          <PdfCard
            title="Download Catalogue PDF"
            description='Public visitors download this from the product page using the "Download Catalogue" button.'
            slot="catalogue"
            url={catalogueUrl}
            fileName={catalogueName}
            upload={upload}
            disabled={busy}
            inputRef={catalogueInput}
            onPick={(file) =>
              void uploadFile("document", file, "catalogue").then((result) => {
                if (!result) return;
                setCatalogueUrl(result.url);
                setCatalogueName(result.name ?? file.name);
                setCataloguePath(result.path ?? null);
              })
            }
            onRemove={() => {
              setCatalogueUrl(null);
              setCatalogueName(null);
              setCataloguePath(null);
            }}
          />
          <PdfCard
            title="Technical Datasheet PDF"
            description="Optional technical datasheet, kept separate from the catalogue."
            slot="datasheet"
            url={datasheetUrl}
            fileName={datasheetName}
            upload={upload}
            disabled={busy}
            inputRef={datasheetInput}
            onPick={(file) =>
              void uploadFile("document", file, "datasheet").then((result) => {
                if (!result) return;
                setDatasheetUrl(result.url);
                setDatasheetName(result.name ?? file.name);
                setDatasheetPath(result.path ?? null);
              })
            }
            onRemove={() => {
              setDatasheetUrl(null);
              setDatasheetName(null);
              setDatasheetPath(null);
            }}
          />
        </div>
      </div>

      {message ? (
        <p
          role="alert"
          className={cn(
            "flex items-start gap-2 rounded-md border px-4 py-3 text-sm font-medium",
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {message.text}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save("draft")}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-primary/40 hover:text-primary disabled:opacity-60"
        >
          {saving === "draft" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
          {start.status === "published" && !isNew ? "Save & unpublish" : "Save as draft"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save("published")}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-primary-deep transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          {saving === "published" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <CheckCircle2 aria-hidden="true" className="size-4" />}
          {start.status === "published" && !isNew ? "Update & publish" : "Publish"}
        </button>
        {previewHref ? (
          <a href={previewHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-deep">
            <ExternalLink aria-hidden="true" className="size-4" />
            Open published page
          </a>
        ) : null}
        <Link href="/admin" className={cn("ml-auto text-sm font-semibold text-muted hover:text-ink", busy && "pointer-events-none opacity-50")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Required() {
  return <span className="text-red-600" aria-hidden="true"> *</span>;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}

function UploadProgress({ upload }: { upload: UploadState }) {
  return (
    <div className="mt-2" role="status" aria-live="polite">
      <div className="flex justify-between text-[11px] font-medium text-muted">
        <span>{upload.label}…</span>
        <span>{upload.progress}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${upload.progress}%` }} />
      </div>
    </div>
  );
}

function PdfCard({
  title,
  description,
  slot,
  url,
  fileName,
  upload,
  disabled,
  inputRef,
  onPick,
  onRemove,
}: {
  title: string;
  description: string;
  slot: string;
  url: string | null;
  fileName: string | null;
  upload: UploadState | null;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="font-display text-base font-bold text-primary-deep">{title}</h2>
      <p className="mt-1 text-xs text-muted">{description}</p>
      {url ? (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-slate-50 p-3">
          <FileText aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <a href={fileProxyUrl(url) ?? undefined} target="_blank" rel="noopener noreferrer" className="truncate text-xs font-semibold text-primary underline">
            {fileName ?? title ?? ""}
          </a>
        </div>
      ) : null}
      {upload?.slot === slot ? <UploadProgress upload={upload} /> : null}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-primary/40 hover:text-primary disabled:opacity-60"
        >
          <Upload aria-hidden="true" className="size-3.5" />
          {url ? "Replace PDF" : "Upload PDF"}
        </button>
        {url ? (
          <button type="button" onClick={onRemove} className="rounded-md border border-line p-2 text-muted hover:text-red-600" aria-label={`Remove ${title}`}>
            <X aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted">PDF up to 10 MB.</p>
    </section>
  );
}

function SpecEditor({ rows, onChange }: { rows: SpecRow[]; onChange: (rows: SpecRow[]) => void }) {
  const update = (index: number, patch: Partial<SpecRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="font-display text-base font-bold text-primary-deep">Technical specifications</h2>
      <p className="mt-1 text-xs text-muted">Name, value and an optional unit (e.g. Capacity · 500 · m³/hr).</p>
      <div className="mt-4 space-y-2">
        {rows.length === 0 ? <p className="text-xs text-muted">No specifications yet.</p> : null}
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:grid-cols-[1.1fr_1fr_0.6fr_auto]">
            <input
              aria-label={`Specification name ${index + 1}`}
              value={row.key}
              onChange={(event) => update(index, { key: event.target.value })}
              placeholder="Name"
              maxLength={80}
              className="rounded-md border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              aria-label={`Specification value ${index + 1}`}
              value={row.value}
              onChange={(event) => update(index, { value: event.target.value })}
              placeholder="Value"
              maxLength={300}
              className="rounded-md border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              aria-label={`Specification unit ${index + 1}`}
              value={row.unit}
              onChange={(event) => update(index, { unit: event.target.value })}
              placeholder="Unit"
              maxLength={30}
              className="col-start-1 rounded-md border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none sm:col-start-auto"
            />
            <div className="col-start-2 flex gap-0.5 sm:col-start-auto">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-md p-2 text-muted hover:text-primary disabled:opacity-30" aria-label={`Move specification ${index + 1} up`}>
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} className="rounded-md p-2 text-muted hover:text-primary disabled:opacity-30" aria-label={`Move specification ${index + 1} down`}>
                <ArrowDown aria-hidden="true" className="size-4" />
              </button>
              <button type="button" onClick={() => onChange(rows.filter((_, i) => i !== index))} className="rounded-md p-2 text-muted hover:text-red-600" aria-label={`Remove specification ${index + 1}`}>
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, { key: "", value: "", unit: "" }])}
        disabled={rows.length >= 40}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-deep disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add specification
      </button>
    </section>
  );
}

function PairEditor({
  title,
  labelKey,
  labelValue,
  pairs,
  onChange,
}: {
  title: string;
  labelKey: string;
  labelValue: string;
  pairs: Pair[];
  onChange: (pairs: Pair[]) => void;
}) {
  const update = (index: number, patch: Partial<Pair>) =>
    onChange(pairs.map((pair, i) => (i === index ? { ...pair, ...patch } : pair)));

  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="font-display text-base font-bold text-primary-deep">{title}</h2>
      <div className="mt-4 space-y-2">
        {pairs.length === 0 ? <p className="text-xs text-muted">No rows yet.</p> : null}
        {pairs.map((pair, index) => (
          <div key={index} className="flex gap-2">
            <input
              aria-label={`${title} ${labelKey} ${index + 1}`}
              value={pair.key}
              onChange={(event) => update(index, { key: event.target.value })}
              placeholder={labelKey}
              maxLength={80}
              className="w-2/5 rounded-md border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              aria-label={`${title} ${labelValue} ${index + 1}`}
              value={pair.value}
              onChange={(event) => update(index, { value: event.target.value })}
              placeholder={labelValue}
              maxLength={300}
              className="flex-1 rounded-md border border-line px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onChange(pairs.filter((_, i) => i !== index))}
              className="rounded-md p-2 text-muted hover:text-red-600"
              aria-label={`Remove row ${index + 1}`}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...pairs, { key: "", value: "" }])}
        disabled={pairs.length >= 40}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-deep disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add row
      </button>
    </section>
  );
}