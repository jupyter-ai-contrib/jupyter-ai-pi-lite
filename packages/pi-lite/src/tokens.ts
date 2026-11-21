import type { IExternalRunContext } from '@jupyterlite/cockle';
import { Token } from '@lumino/coreutils';

/**
 * The pi coding agent of the page, shared by the chat persona and the
 * terminal command.
 */
export interface IPiAgent {
  /**
   * Run pi's interactive mode in a JupyterLite terminal, as an external cockle
   * command. Resolves with the exit code.
   */
  runTerminal(context: IExternalRunContext): Promise<number>;

  /**
   * Stop the pi that runs in a terminal, when its terminal session shuts
   * down.
   */
  stopTerminal(shellId: string): void;
}

export const IPiAgent = new Token<IPiAgent>(
  '@jupyter-ai/pi-lite:IPiAgent',
  'The pi coding agent.'
);

/**
 * The auth of the requests of a provider: the key and the headers to send.
 */
export interface IPiProviderAuth {
  /**
   * The API key of the requests.
   */
  apiKey?: string;
  /**
   * Headers added to the requests, for example an `Authorization` header
   * instead of a key.
   */
  headers?: Record<string, string>;
}

/**
 * A model of a custom provider.
 */
export interface IPiProviderModel {
  /**
   * The model id in the requests.
   */
  id: string;
  /**
   * Default: the id.
   */
  name?: string;
  /**
   * Default: 128000.
   */
  contextWindow?: number;
  /**
   * Default: 16384.
   */
  maxTokens?: number;
  /**
   * Default: false.
   */
  reasoning?: boolean;
  /**
   * Default: text only.
   */
  input?: ('text' | 'image')[];
  /**
   * The prices per million tokens. Default: 0.
   */
  cost?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
}

/**
 * A new provider with the models and the API of a provider of pi
 * (anthropic, openai, mistral...), whose requests go to another URL. The
 * provider of pi stays as it is.
 */
export interface IPiClonedProvider {
  /**
   * The id of the new provider. The ids of pi are rejected.
   */
  id: string;
  /**
   * The display name. Default: the id.
   */
  name?: string;
  /**
   * The id of the provider of pi to clone. Unknown ids are rejected.
   */
  from: string;
  /**
   * The URL of the requests, in place of the one of the provider of pi.
   * Default: the one of pi. pi turns off its settings for some providers
   * (OpenRouter...) when the URL changes: to keep them, leave it out and send
   * the requests elsewhere in `fetch`.
   */
  baseUrl?: string;
  /**
   * Headers added to the requests.
   */
  headers?: Record<string, string>;
  /**
   * Used for all the HTTP requests of the provider.
   */
  fetch?: typeof globalThis.fetch;
  /**
   * Resolves with the auth of the requests, or undefined when the provider is
   * not set up: pi then hides its models. Called for each request. Without
   * it, the provider has no key. The keys that the user saved in pi are never
   * used.
   */
  resolveAuth?: () => Promise<IPiProviderAuth | undefined>;
}

/**
 * A new provider with an OpenAI-compatible API.
 */
export interface IPiCustomProvider {
  /**
   * The id of the new provider. The ids of pi are rejected.
   */
  id: string;
  /**
   * Default: the id.
   */
  name?: string;
  /**
   * The API of the requests: the only one that pi supports for a new
   * provider, OpenAI Chat Completions.
   */
  api: 'openai-completions';
  /**
   * The URL of the API, for example `https://example.com/v1`.
   */
  baseUrl: string;
  /**
   * Headers added to the requests.
   */
  headers?: Record<string, string>;
  /**
   * Used for all the HTTP requests of the provider.
   */
  fetch?: typeof globalThis.fetch;
  /**
   * Resolves with the auth of the requests, or undefined when the provider is
   * not set up: pi then hides its models. Called for each request. Without
   * it, the provider has no key, as a local server.
   */
  resolveAuth?: () => Promise<IPiProviderAuth | undefined>;
  /**
   * The models of the provider.
   */
  models: IPiProviderModel[];
}

/**
 * The model providers that other extensions give to pi.
 */
export interface IPiProviderRegistry {
  /**
   * The providers added with newProvider.
   */
  readonly newProviders: readonly IPiCustomProvider[];

  /**
   * The providers added with cloneProvider.
   */
  readonly clonedProviders: readonly IPiClonedProvider[];

  /**
   * Add a provider with pi's OpenAI Chat Completions API. A provider with
   * the id of a registered one or of a provider of pi is ignored. pi gives it
   * to the sessions that start after.
   */
  newProvider(provider: IPiCustomProvider): void;

  /**
   * Add a provider with the models and the API of a provider of pi. A
   * provider with the id of a registered one or of a provider of pi, or
   * whose `from` is not a provider of pi, is ignored. pi gives it to the
   * sessions that start after.
   */
  cloneProvider(provider: IPiClonedProvider): void;
}

export const IPiProviderRegistry = new Token<IPiProviderRegistry>(
  '@jupyter-ai/pi-lite:IPiProviderRegistry',
  'The model providers that other extensions give to pi.'
);

/**
 * The plugin of the pi agent: also the namespace of its settings and of its
 * secrets.
 */
export const AGENT_PLUGIN_ID = '@jupyter-ai/pi-lite:agent';

/**
 * The chat user of the pi persona.
 */
export const PI_PERSONA_ID = 'pi-frontend';
