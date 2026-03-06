export interface AnchorConfig {
  wsUrl: string;
}

export class AnchorClient {
  private socket: WebSocket | null = null;

  constructor(private readonly config: AnchorConfig) {}

  connect(): void {
    this.socket = new WebSocket(this.config.wsUrl);
  }

  send(message: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(message));
  }
}
