type LinkedInAuthConfig = {
  clientId: string;
  clientSecret: string | null;
  redirectUri: string;
  scope: string;
};

type LinkedInTokenResponse = {
  access_token: string;
  expires_in: number;
  scope?: string;
};

type LinkedInProfileResponse = {
  id?: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  name?: string;
};

function readConfig(requireRedirectUri = true, requireClientSecret = true): LinkedInAuthConfig {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || (requireClientSecret && !clientSecret) || (requireRedirectUri && !redirectUri)) {
    throw new Error("Missing LinkedIn OAuth configuration.");
  }

  return {
    clientId,
    clientSecret: clientSecret ?? null,
    redirectUri: redirectUri ?? "",
    scope: process.env.LINKEDIN_SCOPE || "w_member_social"
  };
}

export function buildLinkedInAuthorizationUrl(params: {
  state: string;
  redirectUri?: string;
  scope?: string;
}) {
  const config = readConfig(false, false);
  const redirectUri = params.redirectUri ?? config.redirectUri;
  const scope = params.scope ?? config.scope;
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", scope);

  return url.toString();
}

export async function exchangeLinkedInCode(code: string, redirectUri?: string) {
  const config = readConfig(false, true);
  const effectiveRedirectUri = redirectUri ?? config.redirectUri;
  if (!effectiveRedirectUri || !config.clientSecret) {
    throw new Error("Missing LinkedIn OAuth configuration.");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: effectiveRedirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`LinkedIn token exchange failed with status ${response.status}.`);
  }

  return (await response.json()) as LinkedInTokenResponse;
}

export async function fetchLinkedInProfile(accessToken: string) {
  try {
    const response = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0"
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as LinkedInProfileResponse;
    const id = data.id;
    const displayName = [data.localizedFirstName, data.localizedLastName].filter(Boolean).join(" ").trim() || data.name || null;

    return {
      memberUrn: id ? `urn:li:person:${id}` : null,
      memberName: displayName
    };
  } catch {
    return null;
  }
}

export async function publishLinkedInPost(params: {
  accessToken: string;
  authorUrn: string;
  text: string;
  articleUrl?: string;
}) {
  const payload = {
    author: params.authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: params.text
        },
        shareMediaCategory: params.articleUrl ? "ARTICLE" : "NONE",
        media: params.articleUrl
          ? [
              {
                status: "READY",
                originalUrl: params.articleUrl,
                title: {
                  text: "Read the article"
                }
              }
            ]
          : []
      }
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`LinkedIn publish failed with status ${response.status}.`);
  }

  const urn = response.headers.get("x-restli-id");
  return {
    postUrn: urn,
    externalUrl: urn ? `https://www.linkedin.com/feed/update/${urn}` : null
  };
}
