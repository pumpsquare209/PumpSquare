import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

// Catalogue/datasheet PDFs are only served by the backend proxy, which checks
// the owning product is still published.
export async function GET(request: Request, context: RouteContext<"/api/files/[...key]">) {
  if (!BACKEND_URL) {
    return NextResponse.json({ ok: false, message: "Backend URL not configured" }, { status: 500 });
  }
  const { key } = await context.params;
  const download = new URL(request.url).searchParams.get("download") === "1" ? "?download=1" : "";

  const response = await fetch(`${BACKEND_URL}/api/files/${key.map(encodeURIComponent).join("/")}${download}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ ok: false, message: "Failed to fetch file" }));
    return NextResponse.json(body, { status: response.status });
  }

  const headers = new Headers({ "Content-Type": response.headers.get("content-type") ?? "application/pdf" });
  for (const name of ["content-disposition", "cache-control", "x-content-type-options"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(response.body, { status: 200, headers });
}
