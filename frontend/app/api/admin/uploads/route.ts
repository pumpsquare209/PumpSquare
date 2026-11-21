import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

async function proxy(request: Request, method: "POST" | "DELETE") {
  if (!BACKEND_URL) {
    return NextResponse.json({ ok: false, message: "Backend URL not configured" }, { status: 500 });
  }
  const cookieHeader = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");

  const response = await fetch(`${BACKEND_URL}/api/admin/uploads`, {
    method,
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(contentType ? { "content-type": contentType } : {}),
    },
    body: await request.arrayBuffer(),
  });

  const data = await response.text();
  return new NextResponse(data, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
  });
}

export async function POST(request: Request) {
  return proxy(request, "POST");
}

export async function DELETE(request: Request) {
  return proxy(request, "DELETE");
}
