import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(request: Request) {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json({ ok: false, message: "Backend URL not configured" }, { status: 500 });
    }
    const cookieHeader = request.headers.get("cookie");
    const response = await fetch(`${BACKEND_URL}/api/admin/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      credentials: "include",
    });

    const data = await response.json();
    const setCookieHeader = response.headers.get("set-cookie");

    const nextResponse = NextResponse.json(data, { status: response.status });
    if (setCookieHeader) {
      nextResponse.headers.set("set-cookie", setCookieHeader);
    }
    return nextResponse;
  } catch (error) {
    console.error("Proxy logout error:", error);
    return NextResponse.json({ ok: false, message: "Failed to logout" }, { status: 500 });
  }
}