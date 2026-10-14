import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";

export async function GET() {
  const session = await auth();
  return NextResponse.json(session || { user: null });
}

export async function POST() {
  return NextResponse.json({ success: true });
}
