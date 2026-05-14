import { NextRequest, NextResponse } from "next/server";
import { createMagicLinkRequest } from "@/lib/auth-db";
import { getMagicLinkUrl, hashMagicLinkToken, randomToken } from "@/lib/auth";

function sanitizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function sanitizeNextPath(value: unknown) {
  return typeof value === "string" && value.startsWith("/") ? value : "/";
}

async function sendMagicLinkEmail(params: {
  to: string;
  link: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Magic link email is not configured.");
    }

    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: "Your Marketier AI login link",
      text: `Use this link to sign in to Marketier AI:\n\n${params.link}\n\nThis link expires in 15 minutes.`,
      html: `<p>Use this link to sign in to Marketier AI:</p><p><a href="${params.link}">${params.link}</a></p><p>This link expires in 15 minutes.</p>`
    })
  });

  if (!response.ok) {
    throw new Error("Unable to send magic link email.");
  }

  return true;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; next?: unknown } | null;
  const email = sanitizeEmail(body?.email);
  const nextPath = sanitizeNextPath(body?.next);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const token = randomToken(32);
  const tokenHash = await hashMagicLinkToken(token);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 1000 * 60 * 15);
  await createMagicLinkRequest({
    email,
    tokenHash,
    nextPath,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  });

  const magicLink = getMagicLinkUrl(token);
  let sent = false;
  try {
    sent = await sendMagicLinkEmail({ to: email, link: magicLink });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unable to send magic link email." },
        { status: 500 }
      );
    }
  }

  const responseBody: Record<string, unknown> = {
    ok: true,
    sent
  };

  if (!sent && process.env.NODE_ENV !== "production") {
    responseBody.magicLink = magicLink;
  }

  return NextResponse.json(responseBody);
}
