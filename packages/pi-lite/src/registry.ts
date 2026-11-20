import type { IPiProvider, IPiProviderRegistry } from './tokens';

/**
 * The model providers that other extensions give to pi, by id. The pi
 * runtime checks their ids when it adds them to pi.
 */
export class ProviderRegistry implements IPiProviderRegistry {
  get providers(): readonly IPiProvider[] {
    return [...this._providers.values()];
  }

  register(provider: IPiProvider): void {
    if (this._providers.has(provider.id)) {
      console.warn(`${provider.id} already exists, ignoring`);
    } else {
      this._providers.set(provider.id, provider);
    }
  }

  private _providers = new Map<string, IPiProvider>();
}
