import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get("marketier_session")?.value);
  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      provider: session.provider
    }
  });
}
