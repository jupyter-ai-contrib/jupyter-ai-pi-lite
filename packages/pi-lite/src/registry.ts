import type {
  IPiClonedProvider,
  IPiCustomProvider,
  IPiProviderRegistry
} from './tokens';

/**
 * The model providers that other extensions give to pi, by id. The pi
 * runtime checks their ids when it adds them to pi.
 */
export class ProviderRegistry implements IPiProviderRegistry {
  get newProviders(): readonly IPiCustomProvider[] {
    return [...this._newProviders.values()];
  }

  get clonedProviders(): readonly IPiClonedProvider[] {
    return [...this._clonedProviders.values()];
  }

  newProvider(provider: IPiCustomProvider): void {
    this._add(this._newProviders, provider);
  }

  cloneProvider(provider: IPiClonedProvider): void {
    this._add(this._clonedProviders, provider);
  }

  /**
   * Add a provider, unless a provider of either list has its id.
   */
  private _add<T extends { id: string }>(
    providers: Map<string, T>,
    provider: T
  ): void {
    if (
      this._newProviders.has(provider.id) ||
      this._clonedProviders.has(provider.id)
    ) {
      console.warn(`${provider.id} already exists, ignoring`);
    } else {
      providers.set(provider.id, provider);
    }
  }

  private _newProviders = new Map<string, IPiCustomProvider>();
  private _clonedProviders = new Map<string, IPiClonedProvider>();
}
