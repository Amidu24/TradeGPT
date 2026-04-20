import WebSocket from "ws";

const REST_BASE = "https://api.derivws.com";
const LEGACY_WS = "wss://ws.derivws.com/websockets/v3";
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

// Try OIDC userinfo — works if auth.deriv.com is OIDC-compliant
export async function getUserInfoAccounts(accessToken: string): Promise<string> {
  const res = await fetch("https://auth.deriv.com/oauth2/userinfo", {
    headers: { "Authorization": `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`userinfo ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text) as Record<string, unknown>;
  // Deriv may return loginid or account_id directly
  const loginid = (json.loginid ?? json.account_id ?? json.sub ?? "") as string;
  if (!loginid) throw new Error(`userinfo ok but no loginid: ${JSON.stringify(json).slice(0, 200)}`);
  return String(loginid);
}

// Legacy V1 WebSocket authorize — use numeric fallback app_id (1089) when
// DERIV_V2_APP_ID is an alphanumeric OAuth client_id (not numeric legacy app_id)
export function authorizeViaLegacyWS(
  accessToken: string,
): Promise<Array<{ loginid: string; is_virtual: number }>> {
  const numericId = /^\d+$/.test(APP_ID) ? APP_ID : "1089";
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${LEGACY_WS}?app_id=${numericId}`);

    ws.on("open", () => ws.send(JSON.stringify({ authorize: accessToken, req_id: 1 })));

    ws.on("message", (raw: Buffer) => {
      const data = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (data.req_id === 1) {
        ws.close();
        if (data.error) {
          const msg = (data.error as Record<string, string>).message ?? JSON.stringify(data.error);
          reject(new Error(msg));
          return;
        }
        const auth = data.authorize as Record<string, unknown>;
        const list = (auth?.account_list as Array<Record<string, unknown>>) ?? [];
        resolve(list.map(a => ({
          loginid: String(a.loginid ?? ""),
          is_virtual: Number(a.is_virtual ?? 0),
        })));
      }
    });

    ws.on("error", reject);
    setTimeout(() => { ws.close(); reject(new Error("Legacy WS timeout")); }, 10000);
  });
}

// V2 REST accounts — try without Deriv-App-ID header as fallback
export async function getAccounts(accessToken: string): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${REST_BASE}/trading/v1/options/accounts`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Deriv-App-ID": APP_ID,
    },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Accounts API ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text) as { data: Array<Record<string, unknown>> };
  return json.data ?? [];
}
