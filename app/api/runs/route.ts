import { listRunSummaries } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const profiles = await listRunSummaries();
  return NextResponse.json({ profiles });
}
