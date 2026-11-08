import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

// Uploads are streamed by app/api/admin/uploads so the catch-all never buffers files.
async function proxy(request: Request, context: RouteContext<"/api/admin/[...path]">) {
  if (!BACKEND_URL) {
    return NextResponse.json({ ok: false, message: "Backend URL not configured" }, { status: 500 });
  }
  const { path } = await context.params;
  const cookieHeader = request.headers.get("cookie");
  const search = new URL(request.url).search;

  const response = await fetch(`${BACKEND_URL}/api/admin/${path.map(encodeURIComponent).join("/")}${search}`, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
  });

  const data = await response.text();
  const nextResponse = new NextResponse(data, { status: response.status });
  nextResponse.headers.set("Content-Type", response.headers.get("content-type") || "application/json");

  const setCookieHeader = response.headers.get("set-cookie");
  if (setCookieHeader) nextResponse.headers.set("set-cookie", setCookieHeader);

  return nextResponse;
}

export async function GET(request: Request, context: RouteContext<"/api/admin/[...path]">) {
  return proxy(request, context);
}

export async function POST(request: Request, context: RouteContext<"/api/admin/[...path]">) {
  return proxy(request, context);
}

export async function PATCH(request: Request, context: RouteContext<"/api/admin/[...path]">) {
  return proxy(request, context);
}

export async function DELETE(request: Request, context: RouteContext<"/api/admin/[...path]">) {
  return proxy(request, context);
}
