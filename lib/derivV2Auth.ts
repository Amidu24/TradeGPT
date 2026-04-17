const REST_BASE = "https://api.derivws.com";
const APP_ID = process.env.DERIV_V2_APP_ID!;

export async function getOtpUrl(accessToken: string, accountId: string): Promise<string> {
  const res = await fetch(`${REST_BASE}/trading/v1/options/accounts/${accountId}/otp`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Deriv-App-ID": APP_ID,
    },
  });

  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith("<")) {
    throw new Error(`OTP failed (${res.status}): ${text.slice(0, 120)}`);
  }

  const json = JSON.parse(text) as { data: { url: string } };
  return json.data.url;
}

export async function getAccounts(accessToken: string): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${REST_BASE}/trading/v1/options/accounts`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Deriv-App-ID": APP_ID,
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`);
  const json = await res.json() as { data: Array<Record<string, unknown>> };
  return json.data ?? [];
}
