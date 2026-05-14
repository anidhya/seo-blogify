import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import LoginClient from "./login-client";

function sanitizeNextPath(nextPath: string | undefined) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/";
  }

  return nextPath;
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get("marketier_session")?.value);
  if (session) {
    redirect(sanitizeNextPath(params.next));
  }

  return <LoginClient nextPath={sanitizeNextPath(params.next)} initialError={params.error ?? null} />;
}
