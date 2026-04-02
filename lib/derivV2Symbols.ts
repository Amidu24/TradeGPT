// V1 → V2 symbol mapping
export const V1_TO_V2: Record<string, string> = {
  frxEURUSD:  "frxEURUSD",
  frxGBPUSD:  "frxGBPUSD",
  frxUSDJPY:  "frxUSDJPY",
  cryBTCUSD:  "cryBTCUSD",
  cryETHUSD:  "cryETHUSD",
  R_100:      "1HZ100V",
  R_75:       "1HZ75V",
  R_50:       "1HZ50V",
  R_25:       "1HZ25V",
  R_10:       "1HZ10V",
  BOOM1000:   "BOOM1000",
  CRASH1000:  "CRASH1000",
  stpRNG:     "stpRNG",
};

export const V2_TO_V1: Record<string, string> = Object.fromEntries(
  Object.entries(V1_TO_V2).map(([k, v]) => [v, k])
);

export function toV2(symbol: string): string {
  return V1_TO_V2[symbol] ?? symbol;
}

export function toV1(symbol: string): string {
  return V2_TO_V1[symbol] ?? symbol;
}

// Detect synthetic/volatile indices by V2 naming
export function isSyntheticV2(symbol: string): boolean {
  return /^1HZ|BOOM|CRASH|stpRNG/i.test(symbol);
}
