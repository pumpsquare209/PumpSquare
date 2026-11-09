import { NextResponse } from "next/server";
import { headers } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET() {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json({ ok: false, user: null }, { status: 500 });
    }
    const headersList = await headers();
    const cookieHeader = headersList.get("cookie");
    const response = await fetch(`${BACKEND_URL}/api/admin/auth/me`, {
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      credentials: "include",
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Proxy auth/me error:", error);
    return NextResponse.json({ ok: false, user: null }, { status: 500 });
  }
}