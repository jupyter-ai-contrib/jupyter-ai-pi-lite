import type {
  Credential,
  CredentialInfo,
  CredentialStore
} from '@earendil-works/pi-ai';
import { Signal, type ISignal } from '@lumino/signaling';
import type { ISecretsManager } from 'jupyter-secrets-manager';
import path from 'path';
import { AuthStorage } from 'pi-coding-agent-package/dist/core/auth-storage.js';

import { AGENT_DIR } from './vfs';

const AUTH_FILE = path.posix.join(AGENT_DIR, 'auth.json');

/**
 * Tells the other tabs that the secrets of pi changed or moved.
 */
const CHANNEL = 'jupyter-ai-pi-lite:credentials';

/**
 * A connector that never answers (none is set) must not block pi.
 */
const SECRETS_TIMEOUT_MS = 30_000;

/**
 * The secrets manager of the page, with the token of the pi namespace.
 */
export interface ISecretsAccess {
  manager: ISecretsManager;
  token: symbol;
  namespace: string;
}

/**
 * A literal value in pi's config value syntax, where `$NAME` reads an
 * environment variable and a leading `!` runs a command.
 */
function escapeConfigValue(value: string): string {
  const escaped = value.replace(/\$/g, () => '$$');
  return escaped.startsWith('!') ? `$${escaped}` : escaped;
}

/**
 * auth.json, saved in the IndexedDB of the page. pi reads `$NAME` and
 * `!command` in its keys: the keys are escaped to stay literal.
 */
class FileCredentials implements CredentialStore {
  read(providerId: string): Promise<Credential | undefined> {
    return this._storage.read(providerId);
  }

  list(): Promise<readonly CredentialInfo[]> {
    return this._storage.list();
  }

  modify(
    providerId: string,
    fn: (current: Credential | undefined) => Promise<Credential | undefined>
  ): Promise<Credential | undefined> {
    return this._storage.modify(providerId, async current => {
      const next = await fn(current);
      return next?.type === 'api_key' && next.key !== undefined
        ? { ...next, key: escapeConfigValue(next.key) }
        : next;
    });
  }

  delete(providerId: string): Promise<void> {
    return this._storage.delete(providerId);
  }

  /**
   * pi's store of auth.json, created on first use: after the agent folder is
   * restored.
   */
  private get _storage(): CredentialStore {
    return (this._authStorage ??= AuthStorage.create(AUTH_FILE));
  }

  private _authStorage?: CredentialStore;
}

/**
 * The value of a secret: an API key without other settings is the key
 * itself, so that a secrets connector can provide the keys of a deployment.
 * The other credentials are JSON.
 */
function toSecret(credential: Credential): string {
  return credential.type === 'api_key' &&
    credential.key !== undefined &&
    !credential.env
    ? credential.key
    : JSON.stringify(credential);
}

function fromSecret(value: string | undefined): Credential | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const credential = JSON.parse(value);
    if (credential?.type === 'api_key' || credential?.type === 'oauth') {
      return credential;
    }
  } catch {
    // A plain API key.
  }
  return { type: 'api_key', key: value };
}

/**
 * The credentials in the secrets manager, one secret for each provider. pi
 * reads them for each request and refresh: they stay in memory, and each
 * list gets them again.
 */
class SecretsCredentials implements CredentialStore {
  constructor(secrets: ISecretsAccess, onChange: () => void) {
    this._secrets = secrets;
    this._onChange = onChange;
  }

  async read(providerId: string): Promise<Credential | undefined> {
    if (this._cache.has(providerId) || this._absent.has(providerId)) {
      return this._cache.get(providerId);
    }
    const version = this._version;
    const credential = fromSecret(await this._fetch(providerId));
    // A write during the fetch is newer.
    if (version === this._version) {
      if (credential) {
        this._cache.set(providerId, credential);
      } else {
        this._absent.add(providerId);
      }
    }
    return credential;
  }

  async list(): Promise<readonly CredentialInfo[]> {
    const { manager, token, namespace } = this._secrets;
    const version = this._version;
    const secrets = await withTimeout(manager.list(token, namespace));
    const credentials = new Map<string, Credential>();
    for (const secret of secrets?.values ?? []) {
      const credential = fromSecret(secret.value);
      if (secret.namespace === namespace && credential) {
        credentials.set(secret.id, credential);
      }
    }
    if (version === this._version) {
      this._cache = new Map(credentials);
      for (const providerId of credentials.keys()) {
        this._absent.delete(providerId);
      }
    }
    return [...credentials].map(([providerId, { type }]) => ({
      providerId,
      type
    }));
  }

  modify(
    providerId: string,
    fn: (current: Credential | undefined) => Promise<Credential | undefined>
  ): Promise<Credential | undefined> {
    return this._queue(providerId, async () => {
      const current = fromSecret(await this._fetch(providerId));
      const next = await fn(current);
      if (next === undefined) {
        return current;
      }
      const { manager, token, namespace } = this._secrets;
      const value = toSecret(next);
      await withTimeout(
        manager.set(token, namespace, providerId, {
          namespace,
          id: providerId,
          value
        })
      );
      // The manager does not fail with a connector that cannot save.
      if ((await this._fetch(providerId)) !== value) {
        throw new Error('the secrets connector does not keep the keys');
      }
      this._version++;
      this._cache.set(providerId, next);
      this._absent.delete(providerId);
      this._onChange();
      return next;
    });
  }

  delete(providerId: string): Promise<void> {
    return this._queue(providerId, async () => {
      const { manager, token, namespace } = this._secrets;
      await withTimeout(manager.remove(token, namespace, providerId));
      this._version++;
      this._cache.delete(providerId);
      this._absent.add(providerId);
      this._onChange();
    });
  }

  /**
   * Forget the values in memory: another tab changed the secrets.
   */
  invalidate(): void {
    this._version++;
    this._cache.clear();
    this._absent.clear();
  }

  private async _fetch(providerId: string): Promise<string | undefined> {
    const { manager, token, namespace } = this._secrets;
    const secret = await withTimeout(manager.get(token, namespace, providerId));
    return secret?.value;
  }

  /**
   * Run the writes of a provider one after the other, as pi expects.
   */
  private _queue<T>(providerId: string, task: () => Promise<T>): Promise<T> {
    const result = (this._pending.get(providerId) ?? Promise.resolve()).then(
      task
    );
    this._pending.set(
      providerId,
      result.catch(() => undefined)
    );
    return result;
  }

  private _secrets: ISecretsAccess;
  private _onChange: () => void;
  private _cache = new Map<string, Credential>();
  /**
   * The providers without a secret, so that pi does not ask for each of
   * them on each refresh.
   */
  private _absent = new Set<string>();
  private _version = 0;
  private _pending = new Map<string, Promise<unknown>>();
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () =>
        reject(
          new Error('the secrets manager does not answer: check its connector')
        ),
      SECRETS_TIMEOUT_MS
    );
    promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}

/**
 * A message to the other tabs: the secrets changed, or pi keeps the keys in
 * another store.
 */
type Message = { type: 'changed' } | { type: 'store'; secrets: boolean };

/**
 * The credentials of pi, shared by all its runtimes: auth.json in the
 * browser storage, or the secrets manager when the user chooses it. The
 * writes wait for a move of the keys.
 */
export class PiCredentials implements CredentialStore {
  constructor(secrets?: ISecretsAccess) {
    if (secrets) {
      this._secrets = new SecretsCredentials(secrets, () => {
        this._post({ type: 'changed' });
        this._changed.emit();
      });
    }
    if (typeof BroadcastChannel !== 'undefined') {
      this._channel = new BroadcastChannel(CHANNEL);
      this._channel.onmessage = event => this._receive(event.data);
    }
  }

  /**
   * Emitted when the secrets change or move. A change of auth.json shows as
   * a change of the agent folder.
   */
  get changed(): ISignal<this, void> {
    return this._changed;
  }

  /**
   * Whether the secrets manager is available to pi.
   */
  get canUseSecretsManager(): boolean {
    return this._secrets !== undefined;
  }

  get usesSecretsManager(): boolean {
    return this._store === this._secrets;
  }

  async read(providerId: string): Promise<Credential | undefined> {
    await this._moved;
    return this._store.read(providerId);
  }

  async list(): Promise<readonly CredentialInfo[]> {
    await this._moved;
    return this._store.list();
  }

  modify(
    providerId: string,
    fn: (current: Credential | undefined) => Promise<Credential | undefined>
  ): Promise<Credential | undefined> {
    return this._run(() => this._store.modify(providerId, fn));
  }

  delete(providerId: string): Promise<void> {
    return this._run(() => this._store.delete(providerId));
  }

  /**
   * Keep the credentials in the secrets manager, or in auth.json. The
   * credentials move to the new store; resolves with their number.
   */
  useSecretsManager(value: boolean): Promise<number> {
    const moving = this._run(() => this._move(value));
    this._moved = moving.catch(() => undefined);
    return moving;
  }

  /**
   * Run the writes and the moves one after the other.
   */
  private _run<T>(task: () => Promise<T>): Promise<T> {
    const result = this._moving.then(task);
    this._moving = result.catch(() => undefined);
    return result;
  }

  private async _move(value: boolean): Promise<number> {
    const source = this._store;
    const target = value && this._secrets ? this._secrets : this._file;
    if (source === target) {
      return 0;
    }
    // A secrets manager that does not work fails here, before pi uses it.
    await target.list();
    const credentials = new Map<string, Credential>();
    try {
      for (const { providerId } of await source.list()) {
        const credential = await source.read(providerId);
        if (credential) {
          credentials.set(providerId, credential);
        }
      }
    } catch (error) {
      if (target !== this._file) {
        throw error;
      }
      // pi cannot read these keys in any store: it goes back to auth.json.
      console.warn('pi: cannot read the keys of the secrets manager', error);
    }
    const copied: string[] = [];
    try {
      for (const [providerId, credential] of credentials) {
        await target.modify(providerId, async () => credential);
        copied.push(providerId);
      }
    } catch (error) {
      // Keep each key in one store only.
      for (const providerId of copied) {
        await target.delete(providerId).catch(() => undefined);
      }
      throw error;
    }
    this._store = target;
    this._post({ type: 'store', secrets: target === this._secrets });
    this._changed.emit();
    // The keys are in the new store: a failed removal only leaves a copy.
    for (const providerId of copied) {
      try {
        await source.delete(providerId);
      } catch (error) {
        console.warn(`pi: cannot remove the old ${providerId} key`, error);
      }
    }
    return copied.length;
  }

  private _post(message: Message): void {
    this._channel?.postMessage(message);
  }

  /**
   * Follow the changes of another tab. A tab that moves the keys removes
   * them from the old store: the other tabs only change their store.
   */
  private _receive(message: Message): void {
    void this._run(async () => {
      if (message.type === 'store') {
        this._store =
          message.secrets && this._secrets ? this._secrets : this._file;
      }
      this._secrets?.invalidate();
    }).then(() => this._changed.emit());
  }

  private _file = new FileCredentials();
  private _secrets?: SecretsCredentials;
  private _store: CredentialStore = this._file;
  private _channel?: BroadcastChannel;
  private _moving: Promise<unknown> = Promise.resolve();
  /**
   * The last move: the reads wait for it, not for the other writes.
   */
  private _moved: Promise<unknown> = Promise.resolve();
  private _changed = new Signal<this, void>(this);
}
