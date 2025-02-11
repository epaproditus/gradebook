import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch("https://classroom.googleapis.com/v1/courses", {
      headers: { Authorization: authHeader }
    });
    const data = await res.json();
    if (res.ok) {
      return NextResponse.json({ courses: data.courses || [] });
    } else {
      return NextResponse.json({ error: data.error?.message || "Error" }, { status: res.status });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
