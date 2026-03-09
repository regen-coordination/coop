import type { StorageLayer } from "./three-layer";

export interface RestStorageOptions {
  baseUrl: string;
  apiKey?: string;
  coopId: string;
}

export class RestStorage<T> implements StorageLayer<T> {
  constructor(private readonly options: RestStorageOptions) {}

  private async request(method: string, path: string, body?: unknown): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.options.apiKey) {
      headers.Authorization = `Bearer ${this.options.apiKey}`;
    }

    const response = await fetch(`${this.options.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`RestStorage ${method} ${path} failed: ${response.status}`);
    }

    return response;
  }

  async put(key: string, value: T): Promise<void> {
    await this.request("POST", "/api/storage/cold", {
      coopId: this.options.coopId,
      id: key,
      content: JSON.stringify(value),
    });
  }

  async get(_key: string): Promise<T | null> {
    // REST storage is write-only for cold persistence
    // Reads should go through local or shared layers
    return null;
  }

  async list(): Promise<Array<{ key: string; value: T }>> {
    // REST storage doesn't support listing
    return [];
  }
}
