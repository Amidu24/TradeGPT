import { NextRequest, NextResponse } from "next/server";
import { getAccounts } from "@/lib/derivV2Auth";

const CLIENT_ID = process.env.DERIV_V2_APP_ID!;
const REDIRECT_URI = process.env.DERIV_V2_REDIRECT_URI!;
const TOKEN_URL = "https://auth.deriv.com/oauth2/token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const storedState = req.cookies.get("oauth_state")?.value;
  const codeVerifier = req.cookies.get("pkce_verifier")?.value;

  const baseUrl = new URL(req.url).origin;

  if (!code || !state || state !== storedState || !codeVerifier) {
    return NextResponse.redirect(`${baseUrl}/?error=auth_failed`);
  }

  // Exchange code for access token
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; expires_in?: number };

  if (!tokenData.access_token) {
    return NextResponse.redirect(`${baseUrl}/?error=token_failed`);
  }

  // Fetch accounts and pick the demo one (safer for hackathon demo)
  let accountId = "";
  let accountType = "demo";
  try {
    const accounts = await getAccounts(tokenData.access_token);
    const demo = accounts.find((a) => a.account_type === "demo");
    const chosen = demo ?? accounts[0];
    if (chosen) {
      accountId = String(chosen.account_id);
      accountType = String(chosen.account_type);
    }
  } catch {
    return NextResponse.redirect(`${baseUrl}/?error=accounts_failed`);
  }

  if (!accountId) {
    return NextResponse.redirect(`${baseUrl}/?error=no_account`);
  }

  const response = NextResponse.redirect(baseUrl);

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: tokenData.expires_in ?? 3600,
    path: "/",
  };

  response.cookies.set("deriv_access_token", tokenData.access_token, cookieOpts);
  response.cookies.set("deriv_account_id", accountId, cookieOpts);
  response.cookies.set("deriv_account_type", accountType, cookieOpts);
  response.cookies.delete("pkce_verifier");
  response.cookies.delete("oauth_state");

  return response;
}
