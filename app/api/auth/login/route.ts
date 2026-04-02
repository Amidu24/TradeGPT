import { NextResponse } from "next/server";
import crypto from "crypto";

const CLIENT_ID = process.env.DERIV_V2_APP_ID!;
const REDIRECT_URI = process.env.DERIV_V2_REDIRECT_URI!;
const AUTH_URL = "https://auth.deriv.com/oauth2/auth";

export async function GET() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  // Encode the verifier inside the state so we don't depend on cookies surviving
  // the Deriv OAuth redirect round-trip
  const statePayload = Buffer.from(JSON.stringify({
    verifier: codeVerifier,
    nonce: crypto.randomBytes(8).toString("hex"),
  })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "trade payments trading_information admin",
    state: statePayload,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(`${AUTH_URL}?${params.toString()}`);
}
