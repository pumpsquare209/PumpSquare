import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

// A reloading backend can reset the first connection; one retry keeps sign-in reliable.
async function login(body: string) {
  if (!BACKEND_URL) throw new Error("Backend URL not configured");
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(`${BACKEND_URL}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch (error) {
      if (attempt > 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

export async function POST(request: Request) {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json({ ok: false, code: "SERVER_ERROR", message: "Backend URL not configured" }, { status: 500 });
    }
    const body = await request.json();
    const response = await login(JSON.stringify(body));

    const data = await response.json();
    const cookieHeader = response.headers.get("set-cookie");

    const nextResponse = NextResponse.json(data, { status: response.status });
    if (cookieHeader) {
      nextResponse.headers.set("set-cookie", cookieHeader);
    }
    return nextResponse;
  } catch (error) {
    console.error("Proxy login error:", error);
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: "Something went wrong." },
      { status: 500 }
    );
  }
}