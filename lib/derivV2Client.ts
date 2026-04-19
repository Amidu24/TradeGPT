import WebSocket from "ws";
import { getOtpUrl } from "./derivV2Auth";

const WS_PUBLIC = "wss://api.derivws.com/trading/v1/options/ws/public";

// Single call on the public (unauthenticated) WebSocket
export function callPublic(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  return wsCall(WS_PUBLIC, payload);
}

// Single authenticated call — fetches a fresh OTP each time
export async function callAuth(
  accessToken: string,
  accountId: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const otpUrl = await getOtpUrl(accessToken, accountId);
  return wsCall(otpUrl, payload);
}

// Multiple authenticated calls on one connection — one OTP, many payloads
export async function callAuthMulti(
  accessToken: string,
  accountId: string,
  payloads: Record<string, unknown>[]
): Promise<Record<number, Record<string, unknown>>> {
  const otpUrl = await getOtpUrl(accessToken, accountId);
  return wsMultiCall(otpUrl, payloads);
}

export async function callAuthPipeline(
  accessToken: string,
  accountId: string,
  proposalParams: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const otpUrl = await getOtpUrl(accessToken, accountId);
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(otpUrl);

    ws.on("open", () => ws.send(JSON.stringify({ ...proposalParams, req_id: 1 })));

    ws.on("message", (raw: Buffer) => {
      const data = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (data.req_id === 1) {
        if (data.error) {
          ws.close();
          reject(new Error((data.error as Record<string, string>).message ?? JSON.stringify(data.error)));
          return;
        }
        const proposal = data.proposal as Record<string, unknown>;
        ws.send(JSON.stringify({ buy: proposal.id, price: proposal.ask_price, req_id: 2 }));
      } else if (data.req_id === 2) {
        ws.close();
        if (data.error) reject(new Error((data.error as Record<string, string>).message ?? JSON.stringify(data.error)));
        else resolve(data);
      }
    });

    ws.on("error", reject);
    setTimeout(() => { ws.close(); reject(new Error("Timeout")); }, 15000);
  });
}

function wsCall(url: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);

    ws.on("open", () => ws.send(JSON.stringify({ ...payload, req_id: 1 })));

    ws.on("message", (raw: Buffer) => {
      const data = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (data.req_id === 1) {
        ws.close();
        if (data.error) reject(new Error((data.error as Record<string, string>).message ?? JSON.stringify(data.error)));
        else resolve(data);
      }
    });

    ws.on("error", reject);
    setTimeout(() => { ws.close(); reject(new Error("Timeout")); }, 10000);
  });
}

function wsMultiCall(
  url: string,
  payloads: Record<string, unknown>[]
): Promise<Record<number, Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const results: Record<number, Record<string, unknown>> = {};
    let pending = payloads.length;

    ws.on("open", () => {
      payloads.forEach((p, i) => ws.send(JSON.stringify({ ...p, req_id: i + 1 })));
    });

    ws.on("message", (raw: Buffer) => {
      const data = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (typeof data.req_id === "number" && data.req_id > 0) {
        results[data.req_id] = data;
        if (--pending === 0) { ws.close(); resolve(results); }
      }
    });

    ws.on("error", reject);
    setTimeout(() => { ws.close(); reject(new Error("Timeout")); }, 12000);
  });
}
