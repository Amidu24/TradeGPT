import { NextRequest, NextResponse } from "next/server";
import { authorizeViaLegacyWS, getAccounts } from "@/lib/derivV2Auth";

const CLIENT_ID   = process.env.DERIV_V2_APP_ID!;
const REDIRECT_URI = process.env.DERIV_V2_REDIRECT_URI!;
const TOKEN_URL   = "https://auth.deriv.com/oauth2/token";

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
  const tokenData   = await tokenRes.json() as Record<string, unknown>;
  const accessToken = tokenData.access_token as string | undefined;

  if (!accessToken) {
    return NextResponse.redirect(`${baseUrl}/?error=token_failed`);
  }

  let accountId   = "";
  let accountType = "demo";
  let wsDebug  = "ws-not-tried";
  let restDebug = "rest-not-tried";

  // Source 1: Legacy V1 WebSocket authorize — documented way to get account list from OAuth token
  try {
    const accounts = await authorizeViaLegacyWS(accessToken);
    wsDebug = `v1ws-ok: ${accounts.length} accounts`;
    const chosen = accounts.find(a => a.is_virtual === 1) ?? accounts[0];
    if (chosen) {
      accountId   = chosen.loginid;
      accountType = chosen.is_virtual === 1 ? "demo" : "real";
    }
  } catch (e) { wsDebug = `v1ws-error: ${e instanceof Error ? e.message : String(e)}`; }

  // Source 2: V2 REST accounts endpoint (fallback)
  if (!accountId) {
    try {
      const accounts = await getAccounts(accessToken);
      restDebug = `rest-ok: ${accounts.length} accounts`;
      const chosen   = accounts.find(a => a.account_type === "demo") ?? accounts[0];
      if (chosen) {
        accountId   = String(chosen.account_id ?? chosen.loginid ?? "");
        accountType = String(chosen.account_type ?? "demo");
      }
    } catch (e) { restDebug = `rest-error: ${e instanceof Error ? e.message : String(e)}`; }
  }

  if (!accountId) {
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(`no_account | ${wsDebug} | ${restDebug}`)}`);
  }

  const response   = NextResponse.redirect(baseUrl);
  const cookieOpts = {
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
