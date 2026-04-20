import { NextRequest, NextResponse } from "next/server";
import { getAccounts } from "@/lib/derivV2Auth";

const CLIENT_ID = process.env.DERIV_V2_APP_ID!;
const REDIRECT_URI = process.env.DERIV_V2_REDIRECT_URI!;
const TOKEN_URL = "https://auth.deriv.com/oauth2/token";

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((part.length + 3) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = new URL(req.url).origin;

  const derivError = searchParams.get("error");
  if (derivError) {
    const msg = searchParams.get("error_description") ?? derivError;
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(msg)}`);
  }

  if (!code || !state) return NextResponse.redirect(`${baseUrl}/?error=missing_params`);

  let codeVerifier: string;
  try {
    const b64    = state.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const data   = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as { verifier: string };
    codeVerifier = data.verifier;
    if (!codeVerifier) throw new Error("no verifier");
  } catch {
    return NextResponse.redirect(`${baseUrl}/?error=state_decode_failed`);
  }

  // Exchange code for access token
  const tokenRes  = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", client_id: CLIENT_ID,
      code, code_verifier: codeVerifier, redirect_uri: REDIRECT_URI,
    }),
  });
  const tokenData = await tokenRes.json() as Record<string, unknown>;
  const accessToken = tokenData.access_token as string | undefined;

  if (!accessToken) {
    const keys = Object.keys(tokenData).join(",");
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(`token_failed (keys: ${keys})`)}`);
  }

  // Resolve account ID — try three sources in order:
  //   1. REST accounts API
  //   2. JWT payload (Deriv embeds account info in the token)
  //   3. Token response body (some OAuth servers include it directly)
  let accountId   = "";
  let accountType = "demo";

  // Source 1: REST accounts API
  try {
    const accounts = await getAccounts(accessToken);
    const chosen   = accounts.find((a) => a.account_type === "demo") ?? accounts[0];
    if (chosen) {
      accountId   = String(chosen.account_id ?? chosen.account_uuid ?? "");
      accountType = String(chosen.account_type ?? "demo");
    }
  } catch { /* fall through to JWT */ }

  // Source 2: JWT payload
  if (!accountId) {
    const jwt = decodeJwt(accessToken);
    if (jwt) {
      accountId   = String(jwt.account_id ?? jwt.account_uuid ?? jwt.loginid ?? jwt.sub ?? "");
      accountType = String(jwt.account_type ?? "demo");
    }
  }

  // Source 3: Token response body
  if (!accountId) {
    accountId   = String(tokenData.account_id ?? tokenData.account_uuid ?? tokenData.loginid ?? "");
    accountType = String(tokenData.account_type ?? "demo");
  }

  if (!accountId) {
    const jwt     = decodeJwt(accessToken);
    const jwtKeys = jwt ? Object.keys(jwt).join(",") : "not-a-jwt";
    const tokKeys = Object.keys(tokenData).join(",");
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(`no_account | tok:${tokKeys} | jwt:${jwtKeys}`)}`);
  }

  const response    = NextResponse.redirect(baseUrl);
  const cookieOpts  = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: (tokenData.expires_in as number) ?? 3600,
    path: "/",
  };

  response.cookies.set("deriv_access_token", accessToken,  cookieOpts);
  response.cookies.set("deriv_account_id",   accountId,    cookieOpts);
  response.cookies.set("deriv_account_type", accountType,  cookieOpts);
  return response;
}
