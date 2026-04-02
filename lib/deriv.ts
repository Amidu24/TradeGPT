const DERIV_WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=1089";

export interface DerivMessage {
  msg_type: string;
  [key: string]: unknown;
}

export class DerivClient {
  private ws: WebSocket | null = null;
  private token: string;
  private pendingRequests: Map<number, { resolve: (data: unknown) => void; reject: (err: unknown) => void }> = new Map();
  private reqId = 1;

  constructor(token: string) {
    this.token = token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(DERIV_WS_URL);

      this.ws.onopen = async () => {
        await this.authorize();
        resolve();
      };

      this.ws.onerror = (err) => reject(err);

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as DerivMessage;
        const id = data.req_id as number;
        if (id && this.pendingRequests.has(id)) {
          const { resolve, reject } = this.pendingRequests.get(id)!;
          if (data.error) {
            reject(data.error);
          } else {
            resolve(data);
          }
          this.pendingRequests.delete(id);
        }
      };
    });
  }

  private send(payload: Record<string, unknown>): Promise<DerivMessage> {
    return new Promise((resolve, reject) => {
      const id = this.reqId++;
      payload.req_id = id;
      this.pendingRequests.set(id, { resolve: resolve as (data: unknown) => void, reject });
      this.ws!.send(JSON.stringify(payload));
    });
  }

  private async authorize(): Promise<DerivMessage> {
    return this.send({ authorize: this.token });
  }

  async getBalance(): Promise<DerivMessage> {
    return this.send({ balance: 1, account: "current" });
  }

  async getActiveSymbols(): Promise<DerivMessage> {
    return this.send({ active_symbols: "brief", product_type: "basic" });
  }

  async getTicks(symbol: string): Promise<DerivMessage> {
    return this.send({ ticks: symbol });
  }

  async getProposal(params: {
    symbol: string;
    amount: number;
    duration: number;
    duration_unit: string;
    contract_type: string;
  }): Promise<DerivMessage> {
    return this.send({
      proposal: 1,
      amount: params.amount,
      basis: "stake",
      contract_type: params.contract_type,
      currency: "USD",
      duration: params.duration,
      duration_unit: params.duration_unit,
      symbol: params.symbol,
    });
  }

  async buyContract(proposalId: string, price: number): Promise<DerivMessage> {
    return this.send({ buy: proposalId, price });
  }

  async getPortfolio(): Promise<DerivMessage> {
    return this.send({ portfolio: 1 });
  }

  async getStatement(): Promise<DerivMessage> {
    return this.send({ statement: 1, limit: 10 });
  }

  disconnect() {
    this.ws?.close();
  }
}
