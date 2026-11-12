import {
  ProviderTransport,
  type ProviderQueryParams,
  type ProviderRequestOptions,
} from "../provider-transport";
import { createStripstreamTransportPolicy } from "./stripstream.transport-policy";

/**
 * Seul point de construction du client provider. Le provider JSON passe par
 * ici ; les octets média passent directement par `ProviderTransport.response()`
 * dans `src/lib/media/stripstream.transport.ts`.
 */
export function createStripstreamClient(url: string, token: string): StripstreamClient {
  return new StripstreamClient(url, token);
}

export class StripstreamClient {
  private transport: ProviderTransport;

  constructor(url: string, token: string) {
    this.transport = new ProviderTransport(createStripstreamTransportPolicy(url, token));
  }

  buildUrl(path: string, params?: ProviderQueryParams): string {
    return this.transport.buildUrl(path, params);
  }

  async fetch<T>(
    path: string,
    params?: ProviderQueryParams,
    options: ProviderRequestOptions = {}
  ): Promise<T> {
    return this.transport.request<T>(path, params, options);
  }
}
