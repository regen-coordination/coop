export interface MembraneEvent {
  coopId: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

export class MembraneClient {
  private socket: WebSocket | null = null;
  private handlers = new Set<(event: MembraneEvent) => void>();

  connect(wsUrl: string): void {
    this.socket = new WebSocket(wsUrl);
    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as MembraneEvent;
        this.handlers.forEach((handler) => handler(parsed));
      } catch {
        // Ignore malformed membrane events.
      }
    };
  }

  publish(event: MembraneEvent): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(event));
  }

  subscribe(handler: (event: MembraneEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
