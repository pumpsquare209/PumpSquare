"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowDown, ArrowUp, CloudUpload, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { categoryText } from "@/lib/category-content";
import type { AdminCategory } from "@/lib/products";
import { slugify } from "@/lib/slugify";

const input = "w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ACCEPTED_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp)$/i;

const MAIN_CATEGORY_OPTIONS = [
  { slug: "pumps-manufactured-by-us", label: "Pumps Manufactured by Us" },
  { slug: "pumps-traded-by-us", label: "Pumps Traded by Us (SEIM Pumps)" },
] as const;

type Draft = {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
  mainCategoryId: string;
  content: string;
  howItWorks: string;
  applications: string;
  usageInfo: string;
  industries: string;
  additionalInfo: string;
  categoryImageUrl: string;
  categoryImageStoragePath: string;
};

function approvedMainCategory(categories: AdminCategory[], slug: string) {
  return categories.find((category) => category.slug === slug && category.level === 0);
}

function defaultMainCategoryId(categories: AdminCategory[]) {
  return MAIN_CATEGORY_OPTIONS.map((option) => approvedMainCategory(categories, option.slug)?.id).find(Boolean) ?? "";
}

function emptyDraft(categories: AdminCategory[]): Draft {
  return {
    name: "",
    slug: "",
    description: "",
    sortOrder: String(categories.reduce((max, category) => Math.max(max, category.sortOrder ?? 0), -1) + 10),
    isActive: true,
    mainCategoryId: defaultMainCategoryId(categories),
    content: "",
    howItWorks: "",
    applications: "",
    usageInfo: "",
    industries: "",
    additionalInfo: "",
    categoryImageUrl: "",
    categoryImageStoragePath: "",
  };
}

function byOrder(a: AdminCategory, b: AdminCategory) {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name);
}

/** Roots in display order, each followed by its children (one level deep). */
function orderedTree(categories: AdminCategory[]) {
  const ids = new Set(categories.map((category) => category.id));
  const isChild = (category: AdminCategory) => Boolean(category.parentId && ids.has(category.parentId));
  const roots = categories.filter((category) => !isChild(category)).sort(byOrder);
  return roots.flatMap((root) => [
    { category: root, depth: 0 },
    ...categories.filter((category) => category.parentId === root.id).sort(byOrder).map((category) => ({ category, depth: 1 })),
  ]);
}

function nameFromPath(path: string | null | undefined) {
  return path ? path.split("/").pop() ?? null : null;
}

export default function CategoryManager({ categories, canEdit }: { categories: AdminCategory[]; canEdit: boolean }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(categories));
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageUpload, setImageUpload] = useState<{ progress: number; label: string } | null>(null);
  const [imageMessage, setImageMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [imageCategoryId, setImageCategoryId] = useState<string | null>(null);
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(null);
  const [previewErrorSrc, setPreviewErrorSrc] = useState<string | null>(null);

  const rows = orderedTree(categories);
  const previewSrc = previewUrl || draft.categoryImageUrl;
  const previewBroken = Boolean(previewSrc && previewErrorSrc === previewSrc);
  const mainCategoryOptions = MAIN_CATEGORY_OPTIONS.map((option) => {
    const category = approvedMainCategory(categories, option.slug);
    return { id: category?.id ?? "", label: option.label, available: Boolean(category && category.isActive !== false) };
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function reset() {
    if (pendingImagePath) void deleteUploadedImage(pendingImagePath);
    setEditing(null);
    setDraft(emptyDraft(categories));
    setError(null);
    setDragging(false);
    setPreviewUrl(null);
    setImageName(null);
    setImageUpload(null);
    setImageMessage(null);
    setImageCategoryId(null);
    setPendingImagePath(null);
    setPreviewErrorSrc(null);
  }

  function startEdit(category: AdminCategory) {
    const approvedIds = MAIN_CATEGORY_OPTIONS.map((option) => approvedMainCategory(categories, option.slug)?.id).filter(Boolean) as string[];
    let mainCategoryId = "";
    if (category.level !== 0) {
      if (category.mainCategoryId && approvedIds.includes(category.mainCategoryId)) mainCategoryId = category.mainCategoryId;
      else if (category.parentId && approvedIds.includes(category.parentId)) mainCategoryId = category.parentId;
      else mainCategoryId = defaultMainCategoryId(categories);
    }

    setEditing(category);
    setDraft({
      name: categoryText(category.name),
      slug: categoryText(category.slug),
      description: categoryText(category.description),
      sortOrder: String(category.sortOrder ?? 0),
      isActive: category.isActive !== false,
      mainCategoryId,
      content: categoryText(category.content),
      howItWorks: categoryText(category.howItWorks),
      applications: categoryText(category.applications),
      usageInfo: categoryText(category.usageInfo),
      industries: categoryText(category.industries),
      additionalInfo: categoryText(category.additionalInfo),
      categoryImageUrl: categoryText(category.categoryImageUrl),
      categoryImageStoragePath: categoryText(category.categoryImageStoragePath),
    });
    setError(null);
    setPreviewUrl(null);
    setImageName(nameFromPath(category.categoryImageStoragePath));
    setImageUpload(null);
    setImageMessage(null);
    setImageCategoryId(null);
    setPendingImagePath(null);
    setPreviewErrorSrc(null);
  }

  async function send(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    if (!response.ok || !data.ok) throw new Error(data.message ?? "Could not save the category.");
  }

  async function deleteUploadedImage(path: string) {
    try {
      await fetch("/api/admin/uploads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
    } catch {
      setImageMessage({ type: "error", text: "Could not remove the uploaded image." });
    }
  }

  async function pickImage(file: File) {
    setError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || !ACCEPTED_IMAGE_EXTENSIONS.test(file.name)) {
      setImageMessage({ type: "error", text: "Use a PNG, JPG, JPEG or WebP image." });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageMessage({ type: "error", text: "Images must be 5 MB or smaller." });
      return;
    }

    setDragging(false);
    setImageMessage(null);
    setPreviewErrorSrc(null);
    setImageUpload({ progress: 0, label: "Uploading image" });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setImageName(file.name);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Could not read the image."));
        reader.readAsDataURL(file);
      });

      const targetId = editing?.id ?? imageCategoryId ?? crypto.randomUUID();
      if (!editing) setImageCategoryId(targetId);

      const result = await new Promise<{ url: string; path: string; name: string }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/admin/uploads");
        request.setRequestHeader("Content-Type", "application/json");
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setImageUpload({ progress: Math.round((event.loaded / event.total) * 100), label: "Uploading image" });
          }
        };
        request.onload = () => {
          let data: { ok?: boolean; url?: string; path?: string; name?: string; message?: string } = {};
          try {
            data = JSON.parse(request.responseText) as typeof data;
          } catch {
            data = {};
          }
          if (request.status >= 200 && request.status < 300 && data.ok && data.url && data.path) {
            resolve({ url: data.url, path: data.path, name: data.name ?? file.name });
          } else {
            reject(new Error(data.message ?? "Image upload failed."));
          }
        };
        request.onerror = () => reject(new Error("Image upload failed."));
        request.send(JSON.stringify({ kind: "category-image", slot: "category", categoryId: targetId, name: file.name, file: base64 }));
      });

      update({ categoryImageUrl: result.url, categoryImageStoragePath: result.path });
      setImageName(result.name);
      setPendingImagePath(result.path);
      setImageUpload(null);
      setImageMessage({ type: "success", text: "Image uploaded. Save the category to apply it." });
    } catch (caught) {
      setPreviewUrl(null);
      setImageName(null);
      setImageUpload(null);
      setImageMessage({ type: "error", text: caught instanceof Error ? caught.message : "Image upload failed." });
    }
  }

  function removeImage() {
    if (pendingImagePath) void deleteUploadedImage(pendingImagePath);
    setPendingImagePath(null);
    setPreviewUrl(null);
    setImageName(null);
    setImageUpload(null);
    setPreviewErrorSrc(null);
    setImageMessage({ type: "success", text: "Image removed. Save the category to apply this change." });
    update({ categoryImageUrl: "", categoryImageStoragePath: "" });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (imageUpload) return;
    if (editing?.level !== 0 && !draft.mainCategoryId) {
      setError("Select a main category.");
      return;
    }

    setBusy(true);
    setError(null);

    const order = Number.parseInt(draft.sortOrder, 10);
    const imageUrl = draft.categoryImageUrl.trim() || null;
    const imagePath = draft.categoryImageStoragePath.trim() || null;
    const body = {
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      description: draft.description.trim(),
      sortOrder: Number.isFinite(order) ? order : 0,
      isActive: draft.isActive,
      mainCategoryId: draft.mainCategoryId || null,
      content: draft.content.trim(),
      howItWorks: draft.howItWorks.trim(),
      applications: draft.applications.trim(),
      usageInfo: draft.usageInfo.trim(),
      industries: draft.industries.trim(),
      additionalInfo: draft.additionalInfo.trim(),
      ...(!editing || imageUrl !== (editing.categoryImageUrl ?? null) ? { categoryImageUrl: imageUrl } : {}),
      ...(!editing || imagePath !== (editing.categoryImageStoragePath ?? null) ? { categoryImageStoragePath: imagePath } : {}),
      ...(!editing && imageCategoryId ? { id: imageCategoryId } : {}),
    };

    try {
      await send(editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories", editing ? "PATCH" : "POST", body);
      setPendingImagePath(null);
      reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the category.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(category: AdminCategory) {
    setBusy(true);
    setError(null);
    try {
      await send(`/api/admin/categories/${category.id}`, "PATCH", { isActive: category.isActive === false });
      if (editing?.id === category.id) setEditing(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the category.");
    } finally {
      setBusy(false);
    }
  }

  async function move(category: AdminCategory, direction: -1 | 1) {
    const siblings = categories.filter((other) => (other.parentId ?? null) === (category.parentId ?? null)).sort(byOrder);
    const index = siblings.findIndex((other) => other.id === category.id);
    const target = siblings[index + direction];
    if (!target) return;

    const order = category.sortOrder ?? 0;
    const targetOrder = target.sortOrder ?? 0;
    setBusy(true);
    setError(null);
    try {
      await send(`/api/admin/categories/${category.id}`, "PATCH", {
        sortOrder: targetOrder === order ? targetOrder + direction : targetOrder,
      });
      await send(`/api/admin/categories/${target.id}`, "PATCH", { sortOrder: order });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reorder categories.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: AdminCategory) {
    if (!window.confirm(`Delete “${category.name}”? This cannot be undone.`)) return;

    setBusy(true);
    setError(null);
    try {
      await send(`/api/admin/categories/${category.id}`, "DELETE");
      if (editing?.id === category.id) reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the category.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {error ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Products</th>
                {canEdit ? <th scope="col" className="px-4 py-3 text-right font-semibold">Order</th> : null}
                {canEdit ? <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ category, depth }) => {
                const active = category.isActive !== false;
                const hasChildren = (category.childIds?.length ?? 0) > 0;
                const locked = category.productCount > 0 || hasChildren;
                const siblings = categories.filter((other) => (other.parentId ?? null) === (category.parentId ?? null)).sort(byOrder);
                const position = siblings.findIndex((other) => other.id === category.id);
                return (
                  <tr key={category.id} className={active ? undefined : "bg-slate-50/60"}>
                    <td className="px-4 py-3">
                      <p className={depth ? "pl-5 text-ink" : "font-semibold text-ink"}>
                        {depth ? <span aria-hidden="true" className="mr-1 text-muted">└</span> : null}
                        {category.name}
                      </p>
                      <p className="text-xs text-muted">
                        {depth ? "Sub-category · " : ""}/products?category={category.slug} · order {category.sortOrder ?? 0}
                      </p>
                      {category.description ? <p className="mt-1 text-xs text-muted">{category.description}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          active
                            ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                            : "rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600"
                        }
                      >
                        {active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {category.productCount > 0 ? (
                        <Link href="/admin" className="font-semibold text-primary hover:underline" title="Products are listed on the dashboard">
                          {category.productCount}
                        </Link>
                      ) : (
                        category.productCount
                      )}
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => move(category, -1)}
                            disabled={busy || position <= 0}
                            className="rounded-md p-2 text-muted hover:bg-slate-100 hover:text-primary disabled:opacity-30"
                            aria-label={`Move ${category.name} up`}
                          >
                            <ArrowUp aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(category, 1)}
                            disabled={busy || position < 0 || position >= siblings.length - 1}
                            className="rounded-md p-2 text-muted hover:bg-slate-100 hover:text-primary disabled:opacity-30"
                            aria-label={`Move ${category.name} down`}
                          >
                            <ArrowDown aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                    {canEdit ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="rounded-md p-2 text-muted hover:bg-slate-100 hover:text-primary"
                            aria-label={`Edit ${category.name}`}
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(category)}
                            disabled={busy}
                            className="rounded-md p-2 text-muted hover:bg-slate-100 hover:text-primary disabled:opacity-50"
                            aria-label={`${active ? "Deactivate" : "Activate"} ${category.name}`}
                            title={active ? "Deactivate" : "Activate"}
                          >
                            <Archive aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(category)}
                            disabled={busy || locked}
                            className="rounded-md p-2 text-muted hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Delete ${category.name}`}
                            title={
                              locked
                                ? hasChildren
                                  ? "Delete or move its sub-categories first."
                                  : "This category has products. Deactivate it or move the products instead."
                                : "Delete"
                            }
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 3} className="px-4 py-10 text-center text-muted">
                    No categories yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Categories with products or sub-categories cannot be deleted. Deactivate them instead — they stay linked to existing
          products but disappear from the public catalogue and cannot be chosen for new products.
        </p>
      </div>

      {canEdit ? (
        <form onSubmit={submit} className="h-fit rounded-xl border border-line bg-white p-5">
          <h2 className="font-display text-base font-bold text-primary-deep">{editing ? "Edit category" : "Add category"}</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="category-name" className="text-sm font-semibold text-ink">Name</label>
              <input
                id="category-name"
                value={draft.name}
                onChange={(event) => {
                  const name = event.target.value;
                  update(editing ? { name } : { name, slug: slugify(name) });
                }}
                minLength={2}
                maxLength={60}
                className={`mt-1.5 ${input}`}
                required
              />
            </div>
            <div>
              <label htmlFor="category-slug" className="text-sm font-semibold text-ink">URL slug</label>
              <input
                id="category-slug"
                value={draft.slug}
                onChange={(event) => update({ slug: event.target.value })}
                maxLength={60}
                className={`mt-1.5 ${input}`}
                required
              />
            </div>
            <div>
              <label htmlFor="category-description" className="text-sm font-semibold text-ink">Description</label>
              <textarea
                id="category-description"
                value={draft.description}
                onChange={(event) => update({ description: event.target.value })}
                rows={2}
                maxLength={300}
                className={`mt-1.5 ${input}`}
              />
            </div>
            <div>
              <label htmlFor="category-main-category" className="text-sm font-semibold text-ink">Main Category</label>
              <select
                id="category-main-category"
                value={draft.mainCategoryId}
                onChange={(event) => update({ mainCategoryId: event.target.value })}
                className={`mt-1.5 ${input}`}
                required={editing?.level !== 0}
              >
                {mainCategoryOptions.map((option) => (
                  <option key={option.label} value={option.id} disabled={!option.id || !option.available}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">Every product-type category belongs directly to one of these main categories.</p>
            </div>
            <div>
              <label htmlFor="category-content" className="text-sm font-semibold text-ink">Category Content</label>
              <textarea
                id="category-content"
                value={draft.content}
                onChange={(event) => update({ content: event.target.value })}
                rows={3}
                maxLength={5000}
                className={`mt-1.5 ${input}`}
              />
              <p className="mt-1 text-xs text-muted">Introduction/description for the category page.</p>
            </div>
            <div>
              <label htmlFor="category-how-it-works" className="text-sm font-semibold text-ink">How It Works</label>
              <textarea
                id="category-how-it-works"
                value={draft.howItWorks}
                onChange={(event) => update({ howItWorks: event.target.value })}
                rows={3}
                maxLength={5000}
                className={`mt-1.5 ${input}`}
              />
              <p className="mt-1 text-xs text-muted">Operating principle for this pump type.</p>
            </div>
            <div>
              <label htmlFor="category-applications" className="text-sm font-semibold text-ink">Applications</label>
              <textarea
                id="category-applications"
                value={draft.applications}
                onChange={(event) => update({ applications: event.target.value })}
                rows={2}
                maxLength={5000}
                className={`mt-1.5 ${input}`}
              />
              <p className="mt-1 text-xs text-muted">Where this pump type is used.</p>
            </div>
            <div>
              <label htmlFor="category-usage-info" className="text-sm font-semibold text-ink">Why Use It</label>
              <textarea
                id="category-usage-info"
                value={draft.usageInfo}
                onChange={(event) => update({ usageInfo: event.target.value })}
                rows={2}
                maxLength={5000}
                className={`mt-1.5 ${input}`}
              />
              <p className="mt-1 text-xs text-muted">Benefits and reasons to select this pump type.</p>
            </div>
            <div>
              <label htmlFor="category-industries" className="text-sm font-semibold text-ink">Industries</label>
              <textarea
                id="category-industries"
                value={draft.industries}
                onChange={(event) => update({ industries: event.target.value })}
                rows={2}
                maxLength={5000}
                className={`mt-1.5 ${input}`}
              />
              <p className="mt-1 text-xs text-muted">Industries served by this pump type.</p>
            </div>
            <div>
              <label htmlFor="category-additional-info" className="text-sm font-semibold text-ink">Additional Information</label>
              <textarea
                id="category-additional-info"
                value={draft.additionalInfo}
                onChange={(event) => update({ additionalInfo: event.target.value })}
                rows={2}
                maxLength={5000}
                className={`mt-1.5 ${input}`}
              />
              <p className="mt-1 text-xs text-muted">Technical or other category information.</p>
            </div>
            <div>
              <span className="text-sm font-semibold text-ink">Category Image</span>
              <input
                ref={fileInput}
                id="category-image-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void pickImage(file);
                  event.target.value = "";
                }}
              />
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) void pickImage(file);
                }}
                className={`mt-1.5 rounded-xl border-2 border-dashed p-3 transition-colors ${
                  dragging ? "border-primary bg-primary-soft/70" : "border-line bg-slate-50 hover:border-primary/40"
                }`}
              >
                {previewSrc ? (
                  <div className="flex flex-col items-center gap-2">
                    {previewBroken ? (
                      <div className="grid h-32 w-full max-w-sm place-items-center rounded-md bg-white text-xs font-medium text-muted">
                        Preview unavailable
                      </div>
                    ) : (
                      <img
                        src={previewSrc}
                        alt="Category image preview"
                        onError={() => setPreviewErrorSrc(previewSrc)}
                        className="h-32 w-full max-w-sm rounded-md bg-white object-contain p-2"
                      />
                    )}
                    {imageName ? <p className="max-w-full truncate text-xs font-semibold text-ink">{imageName}</p> : null}
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        disabled={Boolean(imageUpload)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-primary/40 hover:text-primary disabled:opacity-60"
                      >
                        <CloudUpload aria-hidden="true" className="size-3.5" />
                        Replace image
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        disabled={Boolean(imageUpload)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted hover:text-red-600 disabled:opacity-60"
                      >
                        <X aria-hidden="true" className="size-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="grid w-full place-items-center gap-1.5 px-3 py-5 text-center"
                  >
                    <CloudUpload aria-hidden="true" className="size-8 text-primary" />
                    <span className="text-sm font-semibold text-ink">Drag and drop your category image here</span>
                    <span className="text-xs text-muted">or browse files to upload</span>
                    <span className="mt-1 inline-flex items-center justify-center rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-primary">
                      Browse Files
                    </span>
                  </button>
                )}
              </div>
              {imageUpload ? (
                <div className="mt-2" role="status" aria-live="polite">
                  <div className="flex justify-between text-[11px] font-medium text-muted">
                    <span>{imageUpload.label}…</span>
                    <span>{imageUpload.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${imageUpload.progress}%` }} />
                  </div>
                </div>
              ) : null}
              {imageMessage ? (
                <p
                  role={imageMessage.type === "error" ? "alert" : "status"}
                  className={`mt-2 text-xs font-medium ${imageMessage.type === "error" ? "text-red-600" : "text-emerald-700"}`}
                >
                  {imageMessage.text}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted">PNG, JPG, JPEG or WebP up to 5 MB.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="category-order" className="text-sm font-semibold text-ink">Display order</label>
                <input
                  id="category-order"
                  type="number"
                  min={0}
                  max={9999}
                  value={draft.sortOrder}
                  onChange={(event) => update({ sortOrder: event.target.value })}
                  className={`mt-1.5 ${input}`}
                />
              </div>
              <label className="flex items-end gap-2 pb-2.5 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) => update({ isActive: event.target.checked })}
                  className="size-4 accent-primary"
                />
                Active
              </label>
            </div>
          </div>

          {error ? <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={busy || Boolean(imageUpload)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
              {editing ? "Save Category" : "Add Category"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-line p-2.5 text-muted hover:text-ink"
                aria-label="Cancel editing"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
