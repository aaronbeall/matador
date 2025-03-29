import { Trade } from '../types/Trade';

type WebSocketCallbacks = {
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: Event) => void;
  onTrade: (trade: Trade) => void;
};

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private symbol: string = '';

  constructor(
    private readonly apiKey: string,
    private readonly callbacks: WebSocketCallbacks
  ) {}

  connect(symbol: string) {
    this.symbol = symbol;
    
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`);

    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({ type: 'subscribe', symbol: this.symbol }));
      this.callbacks.onConnected();
    };

    this.ws.onclose = () => {
      this.callbacks.onDisconnected();
    };

    this.ws.onerror = (error) => {
      this.callbacks.onError(error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  private handleMessage(event: MessageEvent) {
    const data = JSON.parse(event.data);
    if (data.type === 'trade') {
      const trade: Trade = {
        price: data.data[0].p,
        timestamp: data.data[0].t,
        volume: data.data[0].v,
        conditions: data.data[0].c
      };
      this.callbacks.onTrade(trade);
    }
  }

  changeSymbol(newSymbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol: this.symbol }));
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol: newSymbol }));
      this.symbol = newSymbol;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
