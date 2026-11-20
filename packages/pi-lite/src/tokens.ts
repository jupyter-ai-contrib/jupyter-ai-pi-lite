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
}

/**
 * A provider of pi (anthropic, openai, mistral...) whose requests go to
 * another URL. Its models and its API stay.
 */
export interface IPiOverriddenProvider {
  /**
   * A provider of pi with another setup. The id must be a provider of pi: other
   * ids are rejected.
   */
  kind: 'override';
  /**
   * The id of a provider of pi.
   */
  id: string;
  /**
   * The URL of the requests, in place of the one of pi.
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
   * it, the provider keeps the key that the user saved in pi.
   */
  resolveAuth?: () => Promise<IPiProviderAuth | undefined>;
}

/**
 * A new provider with an OpenAI-compatible API.
 */
export interface IPiCustomProvider {
  /**
   * A new provider. The id must not be a provider of pi: the ids of pi are
   * rejected.
   */
  kind: 'custom';
  /**
   * A provider id that pi does not have.
   */
  id: string;
  /**
   * Default: the id.
   */
  name?: string;
  /**
   * The API of the requests: OpenAI Chat Completions.
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

export type IPiProvider = IPiOverriddenProvider | IPiCustomProvider;

/**
 * The model providers that other extensions give to pi.
 */
export interface IPiProviderRegistry {
  /**
   * The registered providers.
   */
  readonly providers: readonly IPiProvider[];

  /**
   * Add a provider. A provider with the id of a registered one is ignored.
   * pi gives it to the sessions that start after.
   */
  register(provider: IPiProvider): void;
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
