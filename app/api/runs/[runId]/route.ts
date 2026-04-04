import { deleteRun } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

export async function DELETE(_: Request, { params }: RouteContext) {
  const { runId } = await params;

  if (!runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 400 });
  }

  await deleteRun(runId);
  return NextResponse.json({ ok: true });
}
