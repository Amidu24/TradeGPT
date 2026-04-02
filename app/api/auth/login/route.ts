import { NextResponse } from "next/server";
import crypto from "crypto";

const CLIENT_ID = process.env.DERIV_V2_APP_ID!;
const REDIRECT_URI = process.env.DERIV_V2_REDIRECT_URI!;
const AUTH_URL = "https://auth.deriv.com/oauth2/auth";

export async function GET() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "read trade payments trading_information admin",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const response = NextResponse.redirect(`${AUTH_URL}?${params.toString()}`);

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };

  response.cookies.set("pkce_verifier", codeVerifier, cookieOpts);
  response.cookies.set("oauth_state", state, cookieOpts);

  return response;
}
